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
const abandonedVehicle = require("./abandonedVehicle.js")
const getLocation = require("./addressCollectionFlow")
const intentFlagsFile = require("./helper/intentFlags.js"); const intentFlags = intentFlagsFile.intentFlags;
const trashPickupDay = require("./trashPickupDay.js");
const checkCaseStatus = require("./checkCaseStatus.js");


/*****************************************************************************/
/*                               INTENT HANDLERS                             */
/*****************************************************************************/

/**
 * This handler is triggered when the user says "Alexa, open Sacramento 311"
 */5
const LaunchRequestHandler = {
	canHandle(handlerInput) {
		return (Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest");
	},
	async handle(handlerInput) {
		const { attributesManager, requestEnvelope } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes() || {}; //NOTE: Function definitions can be contained in the event object (handlerInput)

		// DYNAMODB TEST CODE //
		let persistentAttributes = (await attributesManager.getPersistentAttributes()) || {};
		console.log("persistentAttributes: " + JSON.stringify(persistentAttributes));

		var counter = persistentAttributes.hasOwnProperty("counter") ? persistentAttributes.counter : 1;

		persistentAttributes.counter = counter + 1;
		attributesManager.setPersistentAttributes(persistentAttributes); // Pay attention to these two lines: set
		await attributesManager.savePersistentAttributes(); // and then save

		// ***************************CREATING A GENERIC CASE************************** //
		
		// Normally you will create the userResponses object from the slot values in handlerInput
		// You will get the phone number using the phone number collection.
		// You will get the address using the address collection.
		// Address can be unverified, in which case you should first check if ValidatedAddressRes exists in sessionAttributes, otherwise use UnvalidatedAddressRes
		
		// // Create a salesforce case object to be passed to createGenericCase()
		// const token = await helper.getOAuthToken();
		// const myCaseObj = new sfCase(null, null, token);
		
		// // Imagine these slots came from handlerInput
		// const slots = {
		// 	genericDescription: {
		// 		name: 'genericDescription',
		// 		value: 'The storm drain is clogged and our street is flooding.'
		// 	}
		// }
		
		// // Create a userReponses object from the slot values you want to submit to Salesforce
		// const userResponses = {
		// 	'GenericDescription': slots.genericDescription.value
		// }
		// // Create a generic case
		// const create_case_response = await helper.createGenericCase(myCaseObj, 'Curb/Gutter', userResponses, null, '1800 F Street', '2095686272');
		// console.log('create_case_response: ' + JSON.stringify(create_case_response, null, 2));

		// // Finalize the case by updating the case using the case_id from createGenericCase()
		// const update_case_response = await helper.updateGenericCase(myCaseObj, 'Curb/Gutter', userResponses, create_case_response.case_id, '1800 F Street', '2095686272');
		// console.log('update_case_response: ' + JSON.stringify(update_case_response, null, 2));

		// ****************************END CREATING A GENERIC CASE EXAMPLE*************************** //


		speechOutput = handlerInput.t('WELCOME_MSG', { counter: counter });
		return handlerInput.responseBuilder
			.speak(speechOutput)
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
 * //TODO: Investigate if this is necessary
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
 * ingnored in locales that do not support it yet
 * */
const FallbackIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			Alexa.getIntentName(handlerInput.requestEnvelope) ===
			"AMAZON.FallbackIntent"
		);
	},
	// TODO: Add sessionattributes counter for fallbacks. If 3 fallbacks then
	// offer to send to live agent or end the session.
	handle(handlerInput) {
		const sessionAttributes =
			handlerInput.attributesManager.getSessionAttributes();

		if (!sessionAttributes.fallbackCount) {
			sessionAttributes.fallbackCount = 1;
		} else {
			sessionAttributes.fallbackCount++;
			if (sessionAttributes.fallbackCount >= 3) {
				handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
				return handlerInput.responseBuilder
					.speak(handlerInput.t("FALLBACK_STILL_MSG"))
					.reprompt(handlerInput.t("FALLBACK_STILL_MSG_REPROMPT"))
					.getResponse();
			}
		}

		handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
		return handlerInput.responseBuilder
			.speak(handlerInput.t("FALLBACK_MSG"))
			.reprompt(handlerInput.t("FALLBACK_MSG_REPROMPT"))
			.getResponse();
	},
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
		if (handlerInput.requestEnvelope.request.error) {
			let type = handlerInput.requestEnvelope.request.error.type;
			let message = handlerInput.requestEnvelope.request.error.message;
			console.log(`SessionEnded Error: ${type}: ${message}`);
		}
		console.log("Session ended");

		return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
	},
};

/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents
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

		return handlerInput.responseBuilder
			.speak(handlerInput.t("ERROR_MSG"))
			.reprompt(handlerInput.t("ERROR_MSG"))
			.getResponse();
	},
}


/*****************************************************************************/
/*                               INTERCEPTORS                                */
/*****************************************************************************/


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
			// future ContextSwitchingRequestInterceptor known that this intent has
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
			handlerInput.attributesManager.getSessionAttributes().hasDummyValues) {
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


/**
 * When a new session starts, this interceptor loads the persistent attributes
 * from DynamoDB into the session attributes.
*/
const LoadPersistentAttributesInterceptor = {
	async process(handlerInput) {
		if (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
		) {
			const attributesManager = handlerInput.attributesManager;
			const persistentAttributes = await attributesManager.getPersistentAttributes();
			const sessionAttributes = attributesManager.getSessionAttributes();
			if (sessionAttributes.caseNumber = persistentAttributes.caseNumber)
				attributesManager.setSessionAttributes(sessionAttributes);
		}
	},
};




/*****************************************************************************/
/*                        DEV ENVIRONMENT SETUP                              */
/*****************************************************************************/

// Flag for checking if we are running in the Alexa-Hosted Lambda Environment
var ddbClient;

if (process.env.ENVIRONMENT === "dev") {
	console.log("Not running on Alexa-Hosted Lambda Environment")

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

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom
 * */
//arrays can be created prior and passed using ... but there an unintended consequences
//for now place new Handlers and Interceptors manually, order matters!

var requestHandlers = [
	LaunchRequestHandler,
	SessionEndedRequestHandler,
	HelpIntentHandler,
	CancelAndStopIntentHandler,
	FallbackIntentHandler,
	ReportAnIssueIntentHandler,
	yn_AnythingElseIntentHandler,
	yn_RetryIntentHandler,
	checkCaseStatus.GetPreviousCaseIntentHandler,
	abandonedVehicle.StartedAbandonedVehicleIntentHandler,
	getLocation.GetLocationIntentHandler,
	getLocation.SIPGetLocationFromUserIntentHandler,
	getLocation.yn_IsAddressCorrectIntentHandler,
	getLocation.yn_UseGeoLocationIntentHandler,
	getLocation.yn_UseHomeAddressIntentHandler,
	getLocation.yn_TryAnotherAddress,
	abandonedVehicle.InProgressAbandonedVehicleIntentHandler,
	abandonedVehicle.CompletedAbandonedVehicleIntentHandler,
	abandonedVehicle.yn_IsAbandonedVehicleIntentHandler,
	abandonedVehicle.yn_ConfirmVehicleDescriptionIntentHandler,
	abandonedVehicle.yn_ConfirmLicensePlateIntentHandler,
	abandonedVehicle.CompletedAbandonedVehicleIntentHandler,
	trashPickupDay.StartedTrashPickupDayIntentHandler,
	trashPickupDay.InProgressTrashPickupDayIntentHandler
]

var requestInterceptors = [
	LocalisationRequestInterceptor,
	LoadPersistentAttributesInterceptor,
	RestoreDummyValuesRequestInterceptor, // This might have to be before ContextSwitchingRequestInterceptor
	ContextSwitchingRequestInterceptor,
	getLocation.GetLocationRequestInterceptor,
	SetIntentFlagsRequestInterceptor,
]

const skillBuilder = Alexa.SkillBuilders.custom();

skillBuilder
	.addRequestHandlers(...requestHandlers)
	.addRequestInterceptors(...requestInterceptors)
	.withApiClient(new Alexa.DefaultApiClient()) // TODO: No longer using address API. Remove?
	.addErrorHandlers(ErrorHandler)
	.withCustomUserAgent("BigDino")

if (process.env.ENVIRONMENT === "dev") {
	skillBuilder.withPersistenceAdapter(
		new dynamoDbPersistenceAdapter.DynamoDbPersistenceAdapter({
			tableName: "sac311table",
			createTable: true,
			dynamoDBClient: ddbClient,
		})
	)
} else if (process.env.ENVIRONMENT === "lambda") {
	skillBuilder.withPersistenceAdapter(
		new dynamoDbPersistenceAdapter.DynamoDbPersistenceAdapter({
			tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
			createTable: true,
			dynamoDBClient: new AWS.DynamoDB({
				apiVersion: "latest",
				region: process.env.DYNAMODB_PERSISTENCE_REGION,
			}),
		})
	)
}

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