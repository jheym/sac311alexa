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

// Local modules
const helper = require("./helper/helperFunctions.js")
const sfCase = require("./helper/Salesforce_Case_object.js")
const languageStrings = require("./helper/ns-common.json")
const abandonedVehicle = require("./abandoned-vehicle.js")
const homelessCamp = require("./homeless-encampment.js")
const getLocation = require("./getLocation")
const trashpickup = require("./trash-pickup.js")


/*****************************************************************************/
/*                               INTENT HANDLERS                             */
/*****************************************************************************/

/**
 * This handler is triggered when the user says "Alexa, open Sacramento 311"
 */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    );
  },

  async handle(handlerInput) {
   
    const {attributesManager, requestEnvelope } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes() || {}; //NOTE: Function definitions can be contained in the event object (handlerInput)

    // DYNAMODB TEST CODE //
    let persistentAttributes =
      (await attributesManager.getPersistentAttributes()) || {};
    console.log(
      "persistentAttributes: " + JSON.stringify(persistentAttributes)
    );

    var counter = persistentAttributes.hasOwnProperty("counter")
      ? persistentAttributes.counter
      : 1;
    console.log("counter: " + counter);

    persistentAttributes = { counter: counter + 1 };
    attributesManager.setPersistentAttributes(persistentAttributes); // Pay attention to these two lines: set
    await attributesManager.savePersistentAttributes(); // and then save
    // END DYNAMODB TEST CODE //
    
    // // Query SFDB TEST CODE //
    // // This is an example of making a query to the Salesforce database. 
   //  const query = `SELECT Name, Phone FROM Contact WHERE (FirstName='mickey' AND \
   //  LastName='mouse') LIMIT 5`;
    // const contactDetails = await helper.querySFDB(query);
    // console.log('Name: ' + contactDetails.records[0].Name);
    // console.log('Phone: ' + contactDetails.records[0].Phone)
    // // END QUERY SFDB TEST CODE //
    
    // Testing gis endpoints
      // const worldCandidate = await helper.getWorldAddressCandidate('1234 5th st, sacramento, ca 95814');
      // const internalCandidate = await helper.getInternalAddressCandidate(worldCandidate);
      // console.log('worldCandidate: ' + JSON.stringify(worldCandidate));
      // console.log('internalCandidate: ' + JSON.stringify(internalCandidate));

      // //Submit the ticket
      // const ticketTest = await helper.openCase();
      // console.log('ticketTest: ' + JSON.stringify(ticketTest));

      // //Search for CaseNumber using CaseId
      // const query1 = 'SELECT casenumber,id FROM Case WHERE (id = \'' + ticketTest.id + '\') LIMIT 1';
      // const caseNumber = await helper.querySFDB(query1);
      // console.log('caseNumber: ' + caseNumber.records[0].CaseNumber);

      // SALESFORCE CASE OBJECT TEST CODE //
      
      const token = await helper.getOAuthToken();
      const myCase = new sfCase(token); // Creating a new case object with a new token
      const contactID = await myCase.get_contact('9165551111'); // Getting contact details from phone number
      const serviceIDs = await myCase.service_details('Vehicle On Street') // Getting service details from service name
      console.log('myCase: ' + JSON.stringify(myCase)); // Print out all case details stored in the case object so far

      // END SALESFORCE CASE OBJECT TEST CODE //



    speechOutput = handlerInput.t('WELCOME_MSG', { counter: counter });

    return (
      handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt(handlerInput.t('WELCOME_REPROMPT'))
        .getResponse()
    )
  }
}


/**
 * This handler is triggered when the user says something like "I want to report an issue"
 */
const ReportAnIssueIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "ReportAnIssueIntent"
    );
  },
  handle(handlerInput) {
    helper.setQuestion(handlerInput, null)
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
const YesRetryIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.YesIntent" &&
      handlerInput.attributesManager.getSessionAttributes().questionAsked ===
        "TryAgain"
    );
  },
  handle(handlerInput) {
    helper.setQuestion(handlerInput, null) // Remember to clear the questionAsked field for other y/n questions in same session
    return (
      handlerInput.responseBuilder
        .speak(handlerInput.t('YES_RETRY'))
        .withShouldEndSession(false)
        .getResponse()
    )
  }
}


// If the user does not wish to try rephrasing their intent.
//TODO: Investigate if this is necessary
const NoRetryIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NoIntent" &&
      handlerInput.attributesManager.getSessionAttributes().questionAsked ===
        "TryAgain"
    );
  },
  handle(handlerInput) {
    helper.setQuestion(handlerInput, null)
    return (
      handlerInput.responseBuilder
        .speak(handlerInput.t('NO_RETRY'))
        .withShouldEndSession(true) // This will end the session
        .getResponse()
    )
  },
};

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
    // console.log(
    //   `~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`
    // )
    // Any cleanup logic goes here.
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
        .speak(handlerInput.t('INTENT_REFLECTOR',{intentName: Alexa.getIntentName(handlerInput.requestEnvelope)}))
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

    if (
      requestEnvelope.request.type === "IntentRequest" &&
      requestEnvelope.request.dialogState !== "COMPLETED"
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
}


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


/*****************************************************************************/
/*                        DEV ENVIRONMENT SETUP                              */
/*****************************************************************************/

// Flag for checking if we are running in the Alexa-Hosted Lambda Environment
var awsHostedEnv = false;
var ddbClient;

// Checking environment variables to set dynamoDB client
if (process.env['AWS_EXECUTION_ENV'] === 'AWS_Lambda_nodejs12.x') {
  console.log("Running in Alexa-Hosted Lambda Environment")
  awsHostedEnv = true
} else {
  console.log("Not running on Alexa-Hosted Lambda Environment")
  
  require('dotenv').config()
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
    { apiVersion: "latest",
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
if (!awsHostedEnv) {
  exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
      LaunchRequestHandler,
      ReportAnIssueIntentHandler,
      getLocation.GetLocationIntentHandler,
      getLocation.YesUseCurrentLocationIntentHandler,
      getLocation.NoUseCurrentLocationIntentHandler,
      // getLocation.YesUseHomeAddressIntentHandler,
      // getLocation.NoUseHomeAddressIntentHandler,
      getLocation.GetLocationHelperIntentHandler,
      abandonedVehicle.AbandonedVehicleIntentHandler,
      abandonedVehicle.YesAbandonedVehicleIntentHandler,
      abandonedVehicle.YesAbandonedVehicleTimeIntentHandler,
      abandonedVehicle.NoAbandonedVehicleIntentHandler,
      abandonedVehicle.NoAbandonedVehicleTimeIntentHandler,
      homelessCamp.HomelessCampIntentHandler,
      homelessCamp.YesHomelessCampIntentHandler,
      homelessCamp.NoHomelessCampIntentHandler,
      trashpickup.TrashPickUpIntentHandler,
      YesRetryIntentHandler,
      NoRetryIntentHandler,
      FallbackIntentHandler,
      HelpIntentHandler,
      CancelAndStopIntentHandler,
      SessionEndedRequestHandler
      // IntentReflectorHandler,
    )
    .addRequestInterceptors(
      // NewSessionRequestInterceptor,
      // PersonalizationRequestInterceptor, //FIXME: Fix whatever was happening on ronald's machine
      LocalisationRequestInterceptor,
      ContextSwitchingRequestInterceptor,
      getLocation.GetLocationRequestInterceptor
    )
    .addResponseInterceptors
    // DelegateDirectiveResponseInterceptor
    // getLocation.DelegateToGetLocationResponseInterceptor
    ()
    .withApiClient(new Alexa.DefaultApiClient())
    .addErrorHandlers(ErrorHandler)
    .withCustomUserAgent("BigDino")
    .withPersistenceAdapter(
      new dynamoDbPersistenceAdapter.DynamoDbPersistenceAdapter({
        tableName: "sac311table",
        createTable: true,
        dynamoDBClient: ddbClient,
      })
    )
    .lambda();
} 


/* DO NOT EDIT, THESE ARE FOR ALEXA-HOSTED ENVIRONMENT */
else {
  exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
      LaunchRequestHandler,
      ReportAnIssueIntentHandler,
      getLocation.GetLocationIntentHandler,
      getLocation.YesUseCurrentLocationIntentHandler,
      getLocation.NoUseCurrentLocationIntentHandler,
      // getLocation.YesUseHomeAddressIntentHandler,
      // getLocation.NoUseHomeAddressIntentHandler,
      getLocation.GetLocationHelperIntentHandler,
      abandonedVehicle.AbandonedVehicleIntentHandler,
      abandonedVehicle.YesAbandonedVehicleIntentHandler,
      abandonedVehicle.YesAbandonedVehicleTimeIntentHandler,
      abandonedVehicle.NoAbandonedVehicleIntentHandler,
      abandonedVehicle.NoAbandonedVehicleTimeIntentHandler,
      homelessCamp.HomelessCampIntentHandler,
      homelessCamp.YesHomelessCampIntentHandler,
      homelessCamp.NoHomelessCampIntentHandler,
      trashpickup.TrashPickUpIntentHandler,
      YesRetryIntentHandler,
      NoRetryIntentHandler,
      FallbackIntentHandler,
      HelpIntentHandler,
      CancelAndStopIntentHandler,
      SessionEndedRequestHandler
      // IntentReflectorHandler,
    )
    .addRequestInterceptors(
      // NewSessionRequestInterceptor,
      // PersonalizationRequestInterceptor, //FIXME: Fix whatever was happening on ronald's machine
      LocalisationRequestInterceptor,
      ContextSwitchingRequestInterceptor,
      getLocation.GetLocationRequestInterceptor
    )
    .addResponseInterceptors
    // DelegateDirectiveResponseInterceptor
    // getLocation.DelegateToGetLocationResponseInterceptor
    ()
    .withApiClient(new Alexa.DefaultApiClient())
    .addErrorHandlers(ErrorHandler)
    .withCustomUserAgent("BigDino")
    .withPersistenceAdapter(
      new dynamoDbPersistenceAdapter.DynamoDbPersistenceAdapter({
        tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
        createTable: false,
        dynamoDBClient: new AWS.DynamoDB({
          apiVersion: "latest",
          region: process.env.DYNAMODB_PERSISTENCE_REGION,
        }),
      })
    )
    .lambda();
}