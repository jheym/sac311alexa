/* *
 * 🚨 This is the main file for the Sacramento 311 Alexa Skill 📞
 * Written by Andy Chung, Rayman Thandi, Ronald Her, Mico Barcelona, Alex Carrell, Ethan Borg,
 * Humayoon Rafei, and Justin Heyman
 * Team Dinosaur Game 💪
 * */

// NPM Packages
const Alexa = require("ask-sdk")
const AWS = require("aws-sdk")
const dynamoDbPersistenceAdapter = require("ask-sdk-dynamodb-persistence-adapter")
const i18n = require("i18next")
const axios = require("axios")
require('dotenv').config() // TODO: Will this work on lambda env?


// Local modules
const sfCase = require("./helper/SalesforceCaseObject.js")
const helper = require("./helper/helperFunctions.js")
const languageStrings = require("./helper/nsCommon.json")
const abandonedVehicle = require("./serviceRequestIntents/abandonedVehicle.js")
const getLocation = require("./addressCollectionFlow")
const getPhoneNumber = require("./phoneNumberCollection.js")
const intentFlagsFile = require("./helper/intentFlags.js"); const intentFlags = intentFlagsFile.intentFlags;
const trashPickupDay = require("./informationalIntents/trashPickupDay.js");
const getPoliceBeat = require("./informationalIntents/getPoliceBeat.js");
const getCouncilDistrict = require("./informationalIntents/getCouncilDistrict.js");
const foundLostDog = require("./serviceRequestIntents/foundLostDog.js");
const checkCaseStatus = require("./informationalIntents/checkCaseStatus.js");
const cloggedStormDrain = require("./serviceRequestIntents/cloggedStormDrain.js");
const KnowledgeBaseIntent = require("./informationalIntents/KnowledgeBaseIntent.js");
const genericServiceRequest = require("./serviceRequestIntents/genericServiceRequest.js");




/*****************************************************************************/
/*                               INTENT HANDLERS                             */
/*****************************************************************************/

/**
 * This handler is triggered when the user says "Alexa, open Sacramento 311"
 */
const LaunchRequestHandler = {
	canHandle(handlerInput) {
		return (Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest");
	},
	async handle(handlerInput) {
		const { attributesManager, requestEnvelope } = handlerInput;
		let persistentAttributes = (await attributesManager.getPersistentAttributes()) || {}; // get user-associated data from DynamoDB
		
		// call the function to get the time of day.
		const greeting = helper.getTimeOfDay();

		let speechOutput = 
			`<speak> Hello! Thank you for using the City of Sacramento Alexa skill. 
			I can help you make service requests or answer any city related questions you may have. To hear my full 
			list of capabilities, you can say help. What can I do for you this ${greeting}?</speak>`

		let personId = 	requestEnvelope.context.System.person &&
						requestEnvelope.context.System.person.personId;

		if (personId && persistentAttributes.visitCount > 1) {
			let firstName = `<alexa:name type="first" personId="${personId}"/>`
			speechOutput = 
			`<speak> Hi ${firstName}, welcome back to the City of Sacramento Alexa skill. 
			I can help you make service requests or answer any city related questions you may have. To hear my full 
			list of capabilities, you can say help. What can I do for you this ${greeting}?</speak>`
		}
		
		return handlerInput.responseBuilder
			.speak(speechOutput)
			.withShouldEndSession(false) // keep the session open
			.reprompt(handlerInput.t('WELCOME_REPROMPT'))
			.getResponse()
	}
}


/**
 * This handler is triggered when the user says something like "I want to report an issue"
 */

const ReportAnIssueIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			Alexa.getIntentName(handlerInput.requestEnvelope) === "ReportAnIssueIntent"
		);
	},
	handle(handlerInput) {

		helper.setQuestion(handlerInput, null);
		return (
			handlerInput.responseBuilder
				.speak(handlerInput.t('REPORT_ISSUE'))
				.withShouldEndSession(false) // keep the session open
				.getResponse()
		)
	}
}


/**
 * This handler is for handling if the user wants to try reprasing their intent
 */
const yn_RetryIntentHandler = {
	canHandle(handlerInput) {
		const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
		const intentName = Alexa.getIntentName(handlerInput.requestEnvelope)
		const questionAsked = handlerInput.attributesManager.getSessionAttributes().questionAsked;
		return (requestType === "IntentRequest" &&
			(intentName === "AMAZON.YesIntent" || intentName === "AMAZON.NoIntent") &&
			questionAsked === "TryAgain?");
	},
	handle(handlerInput) {
		helper.setQuestion(handlerInput, null) // Remember to clear the questionAsked field for other y/n questions in same session
		const { requestEnvelope, responseBuilder } = handlerInput;
		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			return responseBuilder
				.speak(handlerInput.t('YES_RETRY'))
				.withShouldEndSession(false)
				.getResponse()
		} else {
			return responseBuilder
				.speak(handlerInput.t('NO_RETRY'))
				.withShouldEndSession(true) // This will end the session
				.getResponse()
		}
	}
}

const yn_AnythingElseIntentHandler = {
	canHandle(handlerInput) {
		const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
		const intentName = Alexa.getIntentName(handlerInput.requestEnvelope)
		const questionAsked = handlerInput.attributesManager.getSessionAttributes().questionAsked;
		return (requestType === "IntentRequest" &&
			(intentName === "AMAZON.YesIntent" || intentName === "AMAZON.NoIntent") &&
			questionAsked === "AnythingElse?");
	},
	handle(handlerInput) {
		helper.setQuestion(handlerInput, null)
		const { requestEnvelope, responseBuilder } = handlerInput;
		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			return responseBuilder
				.speak(handlerInput.t('YES_RETRY'))
				.withShouldEndSession(false)
				.getResponse()
		} else {
			return responseBuilder
				.speak(handlerInput.t('NO_RETRY'))
				.withShouldEndSession(true)
				.getResponse()
		}
	}

}

const yn_SubmitGenericServiceRequestIntentHandler = {
	canHandle(handlerInput) {
		const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
		const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
		const questionAsked = handlerInput.attributesManager.getSessionAttributes().questionAsked;
		return (
			requestType === "IntentRequest" && 
			(intentName === "AMAZON.YesIntent" || intentName === "AMAZON.NoIntent") &&
			questionAsked === 'SubmitGenericServiceRequest?'
		);
	},
	handle(handlerInput) {
		helper.setQuestion(handlerInput, null)
		const { requestEnvelope, responseBuilder } = handlerInput;
		
		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			
			const genericServiceRequestIntent = {
				name: 'GenericServiceRequestIntent',
				confirmationStatus: 'NONE',
				slots: {
					genericServiceDescription: {
						name: 'genericServiceDescription',
						value: null,
						confirmationStatus: 'NONE',
			}}}
			let speechOutput = 
			`Sure, we can submit a generic service request. The more descriptive you are, the better we can help you. \
			 I'll give you a chance to review your description before submitting. Okay, I'm ready. Please describe your issue.`
			
			 return responseBuilder
			.speak(speechOutput)
			.addElicitSlotDirective('genericServiceDescription', genericServiceRequestIntent)
			.getResponse();
		} 
		
		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.NoIntent") {
			
			speechOutput = `I'm sorry I wasn't able to help you with that. You can always reach out to the \
			City of Sacramento by calling 3-1-1 or by visiting the website at 3-1-1.cityofsacramento.org. \
			Is there anything else I can help you with?`
			
			helper.setQuestion(handlerInput, 'AnythingElse?');
			
			return responseBuilder
			.speak(speechOutput)
			.withShouldEndSession(false)
			.getResponse();
		}
	}
}

const HelpIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.HelpIntent"
		);
	},
	handle(handlerInput) {
		return handlerInput.responseBuilder
			.speak(handlerInput.t("HELP_MSG"))
			.reprompt(handlerInput.t("HELP_MSG"))
			.getResponse();
	},
};

// TODO: Delegate back to the launchrequest handler
const CancelAndStopIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			(Alexa.getIntentName(handlerInput.requestEnvelope) ===
				"AMAZON.CancelIntent" ||
				Alexa.getIntentName(handlerInput.requestEnvelope) ===
				"AMAZON.StopIntent")
		);
	},
	handle(handlerInput) {
		return handlerInput.responseBuilder
			.speak(handlerInput.t("GOODBYE_MSG"))
			.getResponse();
	},
}


/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to
 * any intents in your skill It must also be defined in the language model (if
 * the locale supports it) This handler can be safely added but will be
 * ignored in locales that do not support it yet
 * */
const FallbackIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			Alexa.getIntentName(handlerInput.requestEnvelope) ===
			"AMAZON.FallbackIntent"
		);
	},

	handle(handlerInput) {
		let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		
		// If the user is in the middle of slot elicitation, then we need to elicit the slot again
		if (sessionAttributes.isElicitingSlot && sessionAttributes.responseToRestore) {
			let { directives, outputSpeech } = sessionAttributes.responseToRestore;
			sessionAttributes.elicitCount = sessionAttributes.elicitCount ? sessionAttributes.elicitCount + 1 : 1;
			handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
			if (sessionAttributes.elicitCount > 2 || (!directives || !directives[0])) {
				// TODO: Don't submit generic service request when asking for phone number
				delete sessionAttributes.elicitCount;
				delete sessionAttributes.responseToRestore;
				sessionAttributes.isElicitingSlot = false;
				handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
				helper.setQuestion(handlerInput, 'SubmitGenericServiceRequest?')
				return handlerInput.responseBuilder
					.speak(`I'm sorry, let's try something else. Would you like to describe your issue to be reviewed by a service agent later? You can say yes or no.`)
					.withShouldEndSession(false)
					.getResponse();
			}
			
			if (sessionAttributes.elicitCount == 1) {
				outputSpeech.ssml = outputSpeech.ssml.replace(/<\/?speak>/g, ''); // remove ssml speak tags
				outputSpeech.ssml = `<speak>Sorry, I didn't quite catch that, ${outputSpeech.ssml}</speak>`
			}

			if (sessionAttributes.elicitCount == 2) {
				outputSpeech.ssml = outputSpeech.ssml.replace(/<\/?speak>/g, ''); // remove ssml speak tags
				outputSpeech.ssml = outputSpeech.ssml.replace(/Let's try that again, /g, '');
				outputSpeech.ssml = `<speak>One more time, ${outputSpeech.ssml}</speak>`
			}
			
			return handlerInput.responseBuilder
			.speak(outputSpeech.ssml)
			.reprompt(outputSpeech.ssml)
			.addDirective(directives[0])
			.getResponse();
		}

		// Note: fallbackCount gets set by the GenericRequestInterceptor
		if (sessionAttributes.fallbackCount > 2) {
			// Offer to submit a generic case
			console.log('fallback failed > 2 times')
			let speechOutput = 
			`I'm sorry, I'm having trouble understanding. If you'd like, \
			I can collect a description of your issue and submit it to the \
			city to be reviewed by a service agent later. Would you like to \
			submit a generic case? You can say yes or no.`;
			helper.setQuestion(handlerInput, 'SubmitGenericServiceRequest?')
			return handlerInput.responseBuilder
				.speak(speechOutput)
				.withShouldEndSession(false)
				.getResponse();
		}

		if (sessionAttributes.fallbackCount == 1) {
			speechOutput = `Hmm, I'm not sure I understand, could you repeat that?`;
			repromptOutput = `I didnt understand what you said, can you repeat that?`;

			if (sessionAttributes.questionAsked === 'AnythingElse?' && sessionAttributes.questionAskedSSML) {
				speechOutput = `I'm sorry, I didn't quite catch that. Is there anything else I can help you with?`
				repromptOutput = `I'm sorry, I didn't quite catch that. Is there anything else I can help you with?`
			} else if (sessionAttributes.questionAsked && sessionAttributes.questionAskedSSML) {
				let ynQuestion = sessionAttributes.questionAskedSSML;
				ynQuestion = ynQuestion.replace(/<\/?speak>/g, ''); // remove ssml speak tags
				speechOutput = `I'm sorry, I didn't quite catch that. ${ynQuestion}`
				repromptOutput = `I'm sorry, I didn't quite catch that. ${ynQuestion}`
			}

			return handlerInput.responseBuilder
				.speak(speechOutput)
				.reprompt(repromptOutput)
				.withShouldEndSession(false)
				.getResponse();
		}

		if (sessionAttributes.fallbackCount == 2) {
			speechOutput = `I'm sorry, I still didn't understand, let's try one more time. Maybe you could try rephrasing your question?`;
			repromptOutput = `I'm sorry, I still didn't understand, let's try one more time. Maybe you could try rephrasing your question?`;
			
			
			if (sessionAttributes.questionAsked === 'AnythingElse?' && sessionAttributes.questionAskedSSML) {
				speechOutput = `I'm sorry, I didn't quite catch that. Is there anything else I can help you with?`
				repromptOutput = `I'm sorry, I didn't quite catch that. Is there anything else I can help you with?`
			} else if (sessionAttributes.questionAsked && sessionAttributes.questionAskedSSML) {
				let ynQuestion = sessionAttributes.questionAskedSSML;
				ynQuestion = ynQuestion.replace(/<\/?speak>/g, ''); // remove ssml speak tags
				speechOutput = ynQuestion;
				repromptOutput = ynQuestion;
			}
			
			return handlerInput.responseBuilder
				.speak(speechOutput)
				.reprompt(repromptOutput)
				.withShouldEndSession(false)
				.getResponse();
		}
		
		throw new Error('Unhandled case in FallbackIntent');

	}
}


/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs
 * */
const SessionEndedRequestHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) ===
			"SessionEndedRequest"
		);
	},
	async handle(handlerInput) {
		const { attributesManager, responseBuilder } = handlerInput;
		let sessionAttributes = attributesManager.getSessionAttributes();

		if (handlerInput.requestEnvelope.request.error) {
			let type = handlerInput.requestEnvelope.request.error.type;
			let message = handlerInput.requestEnvelope.request.error.message;
			console.log(`SessionEnded Error: ${type}: ${message}`);
		}

		if (handlerInput.requestEnvelope.request.reason === 'EXCEEDED_MAX_REPROMPTS' &&
			sessionAttributes.questionAsked && sessionAttributes.questionAskedSSML)
		{
			const repromptQuestion = sessionAttributes.questionAskedSSML;
			return responseBuilder
			.speak(`I'm sorry, I didn't quite catch that. ${repromptQuestion}`)
			.withShouldEndSession(false)
			.getResponse();

		}

		console.log("Session ended");

		return responseBuilder.getResponse(); // notice we send an empty response
	},
};

/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent that was triggered. You can create custom handlers for your intents
 * by defining them above, then also adding them to the request handler chain below
 * */
const IntentReflectorHandler = {
	//not set up with i18n
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
		);
	},
	handle(handlerInput) {
		return (
			handlerInput.responseBuilder
				.speak(handlerInput.t('INTENT_REFLECTOR', { intentName: Alexa.getIntentName(handlerInput.requestEnvelope) }))
				//.reprompt('add a reprompt if you want to keep the session open for the user to respond')
				.getResponse()
		);
	},
};

/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below
 **/
const ErrorHandler = {
	canHandle() {
		return true;
	},
	handle(handlerInput, error) {
		console.log(`~~~~ Error handled ~~~~`);
		console.log(error);

		if (error)

		helper.setQuestion(handlerInput, 'AnythingElse?')
		return handlerInput.responseBuilder
			.speak(handlerInput.t("ERROR_MSG"))
			.reprompt(handlerInput.t("ERROR_MSG"))
			.withShouldEndSession(false)
			.getResponse();
	},
}


/*****************************************************************************/
/*                               INTERCEPTORS                                */
/*****************************************************************************/

/**
 * When a new session starts, this interceptor loads the persistent attributes
 * from DynamoDB into the session attributes.
*/
const NewSessionInterceptor = {
	async process(handlerInput) {
		if (handlerInput.requestEnvelope.session.new) {
			const { attributesManager } = handlerInput;
			let persistentAttributes = await attributesManager.getPersistentAttributes() || {};
			let sessionAttributes = attributesManager.getSessionAttributes() || {};

			persistentAttributes.visitCount = persistentAttributes.visitCount ? persistentAttributes.visitCount + 1 : 1;
			console.log(`Visit count: ${persistentAttributes.visitCount}`);
			attributesManager.setPersistentAttributes(persistentAttributes);
			await attributesManager.savePersistentAttributes();
			
			sessionAttributes.lastCaseSubmitted = persistentAttributes.caseNumber;
			console.log("persistentAttributes loaded into sessionAttributes:\nSessionAttributes = " + JSON.stringify(sessionAttributes, null, 2));
			attributesManager.setSessionAttributes(sessionAttributes);
		}
	}
};

/**
 * Generic request interceptor runs tasks on every intent request that comes in from Alexa
 */
const GenericRequestInterceptor = {
	process(handlerInput) {
		if (handlerInput.requestEnvelope.request.type === "IntentRequest") {
			const { attributesManager } = handlerInput;
			const sessionAttributes = attributesManager.getSessionAttributes();
			
			// Increment the fallback count if the request is a fallback intent, else delete the fallbackCount if exists
			if (handlerInput.requestEnvelope.request.intent.name === "AMAZON.FallbackIntent") {
				sessionAttributes.fallbackCount = sessionAttributes.fallbackCount ? sessionAttributes.fallbackCount + 1 : 1;
				attributesManager.setSessionAttributes(sessionAttributes);
			} else {
				if (sessionAttributes.fallbackCount) {
					delete sessionAttributes.fallbackCount;
					attributesManager.setSessionAttributes(sessionAttributes);
				}
			}
			
		} // if intentRequest
	} // process()
}

/**
 * Generic response interceptor runs tasks before every response that goes out to Alexa
 */
const GenericResponseInterceptor = {
	process(handlerInput, response) {
		
		const directive = response.directives && response.directives[0];
		const { attributesManager } = handlerInput;
		let sessionAttributes = attributesManager.getSessionAttributes();
		
		if (directive && directive.type === 'Dialog.ElicitSlot') {
			sessionAttributes.isElicitingSlot = true;
			sessionAttributes.responseToRestore = response;
			attributesManager.setSessionAttributes(sessionAttributes);
		} else {
			sessionAttributes.isElicitingSlot = false;
			if (sessionAttributes.responseToRestore){
				delete sessionAttributes.responseToRestore;
			}
			if (sessionAttributes.elicitCount) {
				delete sessionAttributes.elicitCount;
			}
			attributesManager.setSessionAttributes(sessionAttributes);
		}
		// console.log("ResponseInterceptor: " + JSON.stringify(response, null, 2));

		if (sessionAttributes.questionAsked && response && response.outputSpeech && response.outputSpeech.ssml) {
			sessionAttributes.questionAskedSSML = response.outputSpeech.ssml;
			attributesManager.setSessionAttributes(sessionAttributes);
		} else {
			if (sessionAttributes.questionAskedSSML) {
				delete sessionAttributes.questionAskedSSML;
			}
			attributesManager.setSessionAttributes(sessionAttributes);
		}
	}
}

/**
 * This request interceptor looks to see if the current intent has any saved
 * slots in session attributes. If so, it will add them to the current intent's
 * slots. This is useful for switching between intents without losing slot
 * values.
 *
 * https://developer.amazon.com/blogs/alexa/post/114cec18-4a38-4cbe-8c6b-0fa6d8413f4f/build-for-context-switching-don-t-forget-important-information-when-switching-between-intents
 */
const ContextSwitchingRequestInterceptor = {
	process(handlerInput) {
		const { requestEnvelope, attributesManager } = handlerInput;
		const currentIntent = requestEnvelope.request.intent;
		const sessionAttributes = attributesManager.getSessionAttributes();

		if (
			requestEnvelope.request.type === "IntentRequest" &&
			requestEnvelope.request.dialogState !== "COMPLETED" &&
			!sessionAttributes.hasDummyValues
		) {
			const sessionAttributes = attributesManager.getSessionAttributes();

			// If this intent has been invoked in the session before, it will have an
			// entry in session attributes
			if (sessionAttributes[currentIntent.name]) {
				let savedSlots = sessionAttributes[currentIntent.name].slots;
				// This loop will add saved slots to the current intent's slots
				for (let key in savedSlots) {
					// The current intent's slot values take precedence over saved slots
					if (!currentIntent.slots[key].value && savedSlots[key].value) {
						currentIntent.slots[key] = savedSlots[key];
					}
				}
			}

			// Regardless of whether we've seen this intent before, we need to let
			// future ContextSwitchingRequestInterceptor know that this intent has
			// been invoked before
			sessionAttributes[currentIntent.name] = currentIntent;
			attributesManager.setSessionAttributes(sessionAttributes);


		}
	}
}

/**
 * When one of the intents in intentFlags is invoked, this interceptor will set
 * the corresponding flags in sessionAttributes. This executes more than it
 * needs to but it the overhead is marginal. 
 * 
 * **Example usage:** the flags are useful
 * for telling the getLocation handlers whether or not to ask for geolocation or
 * home address.
 */
const SetIntentFlagsRequestInterceptor = {
	process(handlerInput) {
		if (handlerInput.requestEnvelope.request.type === "IntentRequest" &&
			handlerInput.requestEnvelope.request.intent.name in intentFlags) {
			const { requestEnvelope, attributesManager } = handlerInput;
			const currentIntent = requestEnvelope.request.intent;
			const sessionAttributes = attributesManager.getSessionAttributes();
			if (!sessionAttributes.intentFlags)
				sessionAttributes.intentFlags = {}
			if (currentIntent.name !== sessionAttributes.intentFlags.intentName) {
				sessionAttributes.intentFlags = intentFlags[currentIntent.name].flags;
				attributesManager.setSessionAttributes(sessionAttributes);
			}
		}
	}
}

/**
 * This interceptor restores the slots values when the switchIntent() function
 * is used.
 */
const RestoreDummyValuesRequestInterceptor = {
	process(handlerInput) {
		if (handlerInput.requestEnvelope.request.type === "IntentRequest" &&
			handlerInput.attributesManager.getSessionAttributes().hasDummyValues) 
		{	
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
			handlerInput.requestEnvelope.request.dialogState = "IN_PROGRESS";
			const dummyIntent = handlerInput.requestEnvelope.request.intent;
			handlerInput.requestEnvelope.request.intent = sessionAttributes[dummyIntent.name];
			delete sessionAttributes.hasDummyValues;
			handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
		}
	}
}


/**
 * This interceptor is responsible for initializing the i18n
 * (internationalization) library and binds the translation function
 * to the handlerInput object.
 */
const LocalisationRequestInterceptor = {
	//add new Strings and keys to ns-common.json
	process(handlerInput) {
		i18n
			.init({
				lng: Alexa.getLocale(handlerInput.requestEnvelope),
				fallbackLng: "en",
				resources: languageStrings,
			})
			.then((t) => {
				handlerInput.t = (...args) => t(...args);
			});
		//i18n.changeLanguage('es'); //use statement to test fallbackLng and spanish functionality
	}
};



/*****************************************************************************/
/*                        DEV ENVIRONMENT SETUP                              */
/*****************************************************************************/

var ddbClient;

if (process.env.ENVIRONMENT === "dev") {
	console.log("Configuring dev environment...")

	// require('dotenv').config() //TODO: Restore this for prod env?
	const { exec } = require('child_process');

	console.log("Starting local dynamoDB server...")
	exec('java -D"java.library.path=../local_dynamodb/DynamoDBLocal_lib" -jar \
  		../local_dynamodb/DynamoDBLocal.jar -sharedDb', (err, stdout, stderr) => {
		if (err) {
			console.log(`error: ${err.message}`);
			return;
		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			return;
		}
		console.log(`stdout: ${stdout}`);
	});

	ddbClient = new AWS.DynamoDB(
		{
			apiVersion: "latest",
			region: "us-west-2",
			endpoint: "http://localhost:8000",
			accessKeyId: 'fakeMyKeyId',
			secretAccessKey: 'fakeSecretAccessKey'
		}
	);
}

/*****************************************************************************/
/*                        ALEXA HANDLER EXPORTS                              */
/*****************************************************************************/


// All new handlers must be added to their respective arrays
var requestHandlers = [
	LaunchRequestHandler,
	SessionEndedRequestHandler,
	HelpIntentHandler,
	CancelAndStopIntentHandler,
	FallbackIntentHandler,
	ReportAnIssueIntentHandler,
	yn_AnythingElseIntentHandler,
	yn_RetryIntentHandler,
	yn_SubmitGenericServiceRequestIntentHandler,
	checkCaseStatus.GetPreviousCaseIntentHandler,
	genericServiceRequest.GenericServiceRequestIntentHandler,
	abandonedVehicle.StartedAbandonedVehicleIntentHandler,
	getLocation.SIPGetLocationFromUserIntentHandler,
	getLocation.yn_IsAddressCorrectIntentHandler,
	getLocation.yn_UseGeoLocationIntentHandler,
	getLocation.yn_UseHomeAddressIntentHandler,
	getLocation.yn_TryAnotherAddress,
	getPhoneNumber.GetPhoneNumberIntentHandler,
	abandonedVehicle.InProgressAbandonedVehicleIntentHandler,
	abandonedVehicle.CompletedAbandonedVehicleIntentHandler,
	abandonedVehicle.yn_IsAbandonedVehicleIntentHandler,
	abandonedVehicle.yn_ConfirmVehicleDescriptionIntentHandler,
	abandonedVehicle.yn_ConfirmLicensePlateIntentHandler,
	abandonedVehicle.CompletedAbandonedVehicleIntentHandler,
	trashPickupDay.StartedTrashPickupDayIntentHandler,
	trashPickupDay.InProgressTrashPickupDayIntentHandler,
	getPoliceBeat.StartedGetPoliceBeatIntentHandler,
	getPoliceBeat.InProgressGetPoliceBeatIntentHandler,
	getPoliceBeat.yn_UseHomeAddressForPoliceBeatIntentHandler,
	getCouncilDistrict.StartedGetCouncilDistrictIntentHandler,
	getCouncilDistrict.InProgressGetCouncilDistrictIntentHandler,
	getCouncilDistrict.yn_UseHomeAddressForCouncilDistrictIntentHandler,
	foundLostDog.StartedFoundLostDogIntentHandler,
	foundLostDog.yn_StartedFoundLostDogIntentHandler,
	foundLostDog.InProgressFoundLostDogIntentHandler,
	foundLostDog.yn_SubmitLostDogServiceRequestIntentHandler,
	foundLostDog.yn_CompletedFoundLostDogServiceRequest,
	KnowledgeBaseIntent.StartedKBTrashCanIntentHandler,
	KnowledgeBaseIntent.StartedKBJunkPickUpIntentHandler,
	KnowledgeBaseIntent.StartedKBPayJunkPickupIntentHandler,
	KnowledgeBaseIntent.StartedKBReplacementContainerIntentHandler,
	trashPickupDay.yn_UseHomeAddressForGarbageDayIntentHandler,
	cloggedStormDrain.StartedCloggedStormDrainIntentHandler,
	cloggedStormDrain.yn_StartedCloggedStormDrainIntentHandler,
	cloggedStormDrain.InProgressCloggedStormDrainIntentHandler,
	cloggedStormDrain.yn_SubmitCloggedDrainServiceRequestIntentHandler,
	cloggedStormDrain.yn_CompletedCloggedStormDrainServiceRequest
]

var requestInterceptors = [
	NewSessionInterceptor,
	GenericRequestInterceptor,
	LocalisationRequestInterceptor,
	RestoreDummyValuesRequestInterceptor, // This might have to be before ContextSwitchingRequestInterceptor
	ContextSwitchingRequestInterceptor,
	getLocation.GetLocationRequestInterceptor,
	SetIntentFlagsRequestInterceptor,
]

var responseInterceptors = [
	GenericResponseInterceptor,
]

// Building the skill and adding all the handlers
const skillBuilder = Alexa.SkillBuilders.custom();

skillBuilder
	.addRequestHandlers(...requestHandlers)
	.addRequestInterceptors(...requestInterceptors)
	.addResponseInterceptors(...responseInterceptors)
	.addErrorHandlers(ErrorHandler)
	.withCustomUserAgent("BigDino")

// Adding the persistence adapter to the skill builder depending on the environment
if (process.env.ENVIRONMENT === "dev") {
	console.log("Setting up persistence adapter for dev environment...")
	skillBuilder.withPersistenceAdapter(
		new dynamoDbPersistenceAdapter.DynamoDbPersistenceAdapter({
			tableName: "sac311table",
			createTable: true,
			dynamoDBClient: ddbClient,
		})
	)
} else if (process.env.ENVIRONMENT === "lambda") {
	console.log("Setting up persistence adapter for lambda environment...")
	skillBuilder.withPersistenceAdapter(
		new dynamoDbPersistenceAdapter.DynamoDbPersistenceAdapter({
			tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
			createTable: false,
			dynamoDBClient: new AWS.DynamoDB({
				apiVersion: "latest",
				region: process.env.DYNAMODB_PERSISTENCE_REGION,
			}),
		})
	)
}

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom
 * */
exports.handler = skillBuilder.lambda();








// UNUSED CODE

/**
 * This request interceptor tries to get the user's full name from the Alexa API
 * at the beginning of a session and saves it to persistent attributes
 * (dynamoDB).
 *
 * FIXME: Figure out why this was breaking for Ronald
 */
const PersonalizationRequestInterceptor = {
	async process(handlerInput) {
		if (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
		) {
			const { attributesManager, requestEnvelope } = handlerInput;
			const { apiAccessToken } = requestEnvelope.context.System
				? requestEnvelope.context.System
				: null;
			const sessionAttributes = attributesManager.getSessionAttributes() || {};
			let persistentAttributes =
				(await attributesManager.getPersistentAttributes()) || {};
			console.log(
				"persistentAttributes: " + JSON.stringify(persistentAttributes)
			);
			const userFullName = persistentAttributes.hasOwnProperty("userFullName")
				? persistentAttributes.userFullName
				: null;
			console.log("userFullName: " + userFullName);

			// If no full name was in persistent attributes, get it from the API
			if (!userFullName) {
				// Axios config to set headers
				let config = {
					headers: {
						Authorization: `Bearer ${apiAccessToken}`,
					},
				};

				try {
					res = await axios.get(
						"https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.name",
						config
					);
				} catch (error) {
					console.log("There was a problem getting the user's name");
					console.log(error);
				}

				if (res.status === 200) {
					persistentAttributes = { userFullName: res.data };
					attributesManager.setPersistentAttributes(persistentAttributes); // Pay attention to these two lines: set
					await attributesManager.savePersistentAttributes(); // and then save
				} else {
					console.log("There was a problem getting the user's name");
					console.log(res);
				}
			} else {
				// Else, if there was a full name in persistent attributes, set it in session attributes
				sessionAttributes.userFullName = userFullName;
				attributesManager.setSessionAttributes(sessionAttributes);
			}
		}
	},
};


/**
 * This is a response interceptor. Not currently in use but could be used as an
 * example of how to manipulate the outgoing response.
 *
 * The purpose of this interceptor is to detect if the outgoing response
 * contains a delegateDirective(), and if so, autofill any saved slots for the
 * intent being delegated to
 */
const DelegateDirectiveResponseInterceptor = {
	process(handlerInput, response) {
		// console.log(response)

		// If the response has dialog delegate directives, add any existing slots from session attributes
		if (
			response.directives &&
			response.directives[0].updatedIntent &&
			response.directives[0].type === "Dialog.Delegate"
		) {
			const sessionAttributes =
				handlerInput.attributesManager.getSessionAttributes();
			// const currentIntent = handlerInput.requestEnvelope.request.intent
			const delegatedIntent = response.directives[0].updatedIntent;
			if (sessionAttributes[delegatedIntent.name]) {
				let savedSlots = sessionAttributes[delegatedIntent.name].slots;
				for (let key in savedSlots) {
					if (
						!response.directives[0].updatedIntent.slots[key].value &&
						savedSlots[key].value
					) {
						response.directives[0].updatedIntent.slots[key] = savedSlots[key];
					}
				}
			}
			console.log(response);
		}
	}
};