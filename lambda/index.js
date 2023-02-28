/* *
 * 🚨 This is the main file for the Sacramento 311 Alexa Skill 📞
 * Written by Andy Chung, Rayman Thandi, Ronald Her, Mico Barcelona, Alexa Carrell, Ethan Borg, 
 * Humayoon Rafei, and Justin Heyman
 * Team Dinosaur Game 💪
 * */


const Alexa = require("ask-sdk")
const AWS = require("aws-sdk")
const dynamoDbPersistenceAdapter = require("ask-sdk-dynamodb-persistence-adapter")
const i18n = require("i18next")
const axios = require("axios")



// Flag for checking if we are running in the Alexa-Hosted Lambda Environment
var awsHostedEnv = false
var ddbClient


// Checking environment variables to set dynamoDB client
if (process.env['AWS_EXECUTION_ENV'] === 'AWS_Lambda_nodejs12.x') {
  console.log("Running in Alexa-Hosted Lambda Environment")
  awsHostedEnv = true
} else {
  console.log("Not running on Alexa-Hosted Lambda Environment")
  // TODO: Check to see this works on windows
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


// TODO: Remove this later
console.log(process.env)

// Creating the local dynamoDB client for development
// You will need to install dynamoDB locally and run it on port 8000
// https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html#DynamoDBLocal.DownloadingAndRunning.title


const languageStrings = require("./ns-common.json")
const strayAnimal = require("./strayAnimal.js")
const abandonedVehicle = require("./abandoned-vehicle.js")
const potHole = require("./pothole.js")
const petcomplaint = require("./petcomplaint.js")
const homelessCamp = require("./homeless-encampment.js")
const getLocation = require("./getLocation")
const dirtyBathroom = require("./dirty-bathroom.js")
const trashpickup = require("./trash-pickup.js")
const liveAgent = require("./liveAgent.js")

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    )
  },
  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const attributesManager = handlerInput.attributesManager;

    // DYNAMODB TEST CODE //
    let persistentAttributes = await attributesManager.getPersistentAttributes() || {};
    console.log('persistentAttributes: ' + JSON.stringify(persistentAttributes));
    
    var counter = persistentAttributes.hasOwnProperty('counter') ? persistentAttributes.counter : 1;
    console.log('counter: ' + counter)

    persistentAttributes = {"counter": counter + 1}
    attributesManager.setPersistentAttributes(persistentAttributes)  // Pay attention to these two lines: set 
    await attributesManager.savePersistentAttributes()           // and then save
    // END DYNAMODB TEST CODE //


    // If we found the user's name in dynamodb, personalize the welcome message
    if (sessionAttributes.userFullName) {
      return (
        handlerInput.responseBuilder
          .speak(handlerInput.t('PERSONALIZED_WELCOME_MSG', { name: sessionAttributes.userFullName })) // TODO: Trim last name
          .reprompt(handlerInput.t('WELCOME_REPROMPT'))
          .getResponse()
      )
    } else {
      return (
        handlerInput.responseBuilder
          .speak(handlerInput.t('WELCOME_MSG', { counter: counter })) // TODO: DynamoDB test counter is temporary
          .reprompt(handlerInput.t('WELCOME_REPROMPT'))
          .getResponse()
      )
    }
  }
}

const ReportAnIssueIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ReportAnIssueIntent'
    )
  },
  handle(handlerInput) {
    setQuestion(handlerInput, null)
    return (
      handlerInput.responseBuilder
        .speak(handlerInput.t('REPORT_ISSUE'))
        .withShouldEndSession(false) // keep the session open
        .getResponse()
    )
  }
}


// If the user wishes to try rephrasing their intent
const YesRetryIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'TryAgain'
    )
  },
  handle(handlerInput) {
    setQuestion(handlerInput, null) // Remember to clear the questionAsked field for other y/n questions in same session
    return (
      handlerInput.responseBuilder
        .speak(handlerInput.t('YES_RETRY'))
        .withShouldEndSession(false)
        .getResponse()
    )
  }
}


// If the user does not wish to try rephrasing their intent.
const NoRetryIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'TryAgain'
    )
  },
  handle(handlerInput) {
    setQuestion(handlerInput, null)
    return (
      handlerInput.responseBuilder
        .speak(handlerInput.t('NO_RETRY'))
        .withShouldEndSession(true) // This will end the session
        .getResponse()
    )
  },
}

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.HelpIntent"
    )
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(handlerInput.t('HELP_MSG'))
      .reprompt(handlerInput.t('HELP_MSG'))
      .getResponse()
  },
}

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.CancelIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.StopIntent")
    )
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak(handlerInput.t('GOODBYE_MSG')).getResponse()
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
    )
  },
  // TODO: Add sessionattributes counter for fallbacks. If 3 fallbacks then
  // offer to send to live agent or end the session.
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()

    if (!sessionAttributes.fallbackCount) {
      sessionAttributes.fallbackCount = 1
    } else {
      sessionAttributes.fallbackCount++
      if (sessionAttributes.fallbackCount >= 3) {
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes)
        return handlerInput.responseBuilder
          .speak(handlerInput.t('FALLBACK_STILL_MSG'))
          .reprompt(handlerInput.t('FALLBACK_STILL_MSG_REPROMPT'))
          .getResponse()
      }
    }

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes)
    return handlerInput.responseBuilder
      .speak(handlerInput.t('FALLBACK_MSG'))
      .reprompt(handlerInput.t('FALLBACK_MSG_REPROMPT'))
      .getResponse()
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
    )
  },
  async handle(handlerInput) {
    // console.log(
    //   `~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`
    // )
    // Any cleanup logic goes here.
    console.log("Session ended")

    return handlerInput.responseBuilder
      .getResponse(); // notice we send an empty response
  },
}


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
    )
  },
  handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope)
    const speakOutput = `You just triggered ${intentName}`

    return (
      handlerInput.responseBuilder
        .speak(speakOutput)
        //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
        .getResponse()
    )
  },
}


/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below
 **/
const ErrorHandler = {
  canHandle() {
    return true
  },
  handle(handlerInput, error) {
    console.log(`~~~~ Error handled ~~~~`)
    console.log(error)

    return handlerInput.responseBuilder
      .speak(handlerInput.t('ERROR_MSG'))
      .reprompt(handlerInput.t('ERROR_MSG'))
      .getResponse()
  },
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
    const { requestEnvelope, attributesManager } = handlerInput
    const currentIntent = requestEnvelope.request.intent

    if (requestEnvelope.request.type === 'IntentRequest'
      && requestEnvelope.request.dialogState !== 'COMPLETED') {
      
      const sessionAttributes = attributesManager.getSessionAttributes();
      
      // If this intent has been invoked in the session before, it will have an
      // entry in session attributes
      if (sessionAttributes[currentIntent.name]) {
        let savedSlots = sessionAttributes[currentIntent.name].slots
        // This loop will add saved slots to the current intent's slots
        for (let key in savedSlots) {
          // The current intent's slot values take precedence over saved slots
          if (!currentIntent.slots[key].value && savedSlots[key].value) {
            currentIntent.slots[key] = savedSlots[key]
          }
        }
      }

      // Regardless of whether we've seen this intent before, we need to let
      // future ContextSwitchingRequestInterceptor known that this intent has
      // been invoked before
      sessionAttributes[currentIntent.name] = currentIntent
      attributesManager.setSessionAttributes(sessionAttributes)
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
    if (response.directives && response.directives[0].updatedIntent && response.directives[0].type === 'Dialog.Delegate') {
      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
      // const currentIntent = handlerInput.requestEnvelope.request.intent
      const delegatedIntent = response.directives[0].updatedIntent
      if (sessionAttributes[delegatedIntent.name]) {
        let savedSlots = sessionAttributes[delegatedIntent.name].slots
        for (let key in savedSlots) {
          if (!response.directives[0].updatedIntent.slots[key].value && savedSlots[key].value) {
            response.directives[0].updatedIntent.slots[key] = savedSlots[key]
          }
        }
      }
      console.log(response)
    }
  }
}

/**
 * TODO: Ethan - Document this
 */
const LocalisationRequestInterceptor = {
  //add new Strings and keys to ns-common.json
  process(handlerInput) {
      i18n.init({
          lng: Alexa.getLocale(handlerInput.requestEnvelope),
          fallbackLng: 'en',
          resources: languageStrings
      }).then((t) => {
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
    if (Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest") {
      const { attributesManager, requestEnvelope } = handlerInput
      const {apiAccessToken} = requestEnvelope.context.System ? requestEnvelope.context.System : null;
      const sessionAttributes = attributesManager.getSessionAttributes() || {};
      let persistentAttributes = await attributesManager.getPersistentAttributes() || {};
      console.log('persistentAttributes: ' + JSON.stringify(persistentAttributes));
      const userFullName = persistentAttributes.hasOwnProperty('userFullName') ? persistentAttributes.userFullName : null;
      console.log('userFullName: ' + userFullName)

      // If no full name was in persistent attributes, get it from the API
      if (!userFullName) {

      // Axios config to set headers
        let config = {
          headers: {
            'Authorization': `Bearer ${apiAccessToken}`
          }
        }

        try {
          res = await axios.get(
          'https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.name',
          config
        )
        } catch (error) {
          console.log("There was a problem getting the user's name") 
          console.log(error)
        }

        if (res.status === 200) {
          persistentAttributes = {"userFullName":res.data}
          attributesManager.setPersistentAttributes(persistentAttributes)  // Pay attention to these two lines: set 
          await attributesManager.savePersistentAttributes()                // and then save
        } else {
          console.log("There was a problem getting the user's name") 
          console.log(res)
        }

      } else {  // Else, if there was a full name in persistent attributes, set it in session attributes  
        sessionAttributes.userFullName = userFullName
        attributesManager.setSessionAttributes(sessionAttributes)
      }
    }
  }
}

// Stores the asked question in a session attribute for yes and no intent handlers
function setQuestion(handlerInput, questionAsked) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  sessionAttributes.questionAsked = questionAsked;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom
 * */
//arrays can be created prior and passed using ... but there an unintended consequences
//for now place new Handlers and Interceptors manually, order matters!
if (!awsHostedEnv) {  // Running Locally
  exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
      LaunchRequestHandler,
      ReportAnIssueIntentHandler,
      getLocation.GetLocationIntentHandler,
      getLocation.YesUseCurrentLocationIntentHandler,
      getLocation.NoUseCurrentLocationIntentHandler,
      getLocation.YesUseHomeAddressIntentHandler,
      getLocation.NoUseHomeAddressIntentHandler,
      getLocation.GetLocationHelperIntentHandler,
      liveAgent.LiveAgentIntentHandler,
      abandonedVehicle.AbandonedVehicleIntentHandler,
      abandonedVehicle.YesAbandonedVehicleIntentHandler,
      abandonedVehicle.YesAbandonedVehicleTimeIntentHandler,
      abandonedVehicle.NoAbandonedVehicleIntentHandler,
      abandonedVehicle.NoAbandonedVehicleTimeIntentHandler,
      homelessCamp.HomelessCampIntentHandler,
      homelessCamp.YesHomelessCampIntentHandler,
      homelessCamp.NoHomelessCampIntentHandler,
      potHole.PotHoleRequestHandler,
      petcomplaint.petcomplaintHandler,
      trashpickup.TrashPickUpIntentHandler,
      strayAnimal.strayAnimalHandler,
      dirtyBathroom.dirtyBathroomHandler,
      YesRetryIntentHandler,
      NoRetryIntentHandler,
      FallbackIntentHandler,
      HelpIntentHandler,
      CancelAndStopIntentHandler,
      SessionEndedRequestHandler,
      // IntentReflectorHandler,
    )
    .addRequestInterceptors(
      // NewSessionRequestInterceptor,
      // PersonalizationRequestInterceptor, //FIXME: Fix whatever was happening on ronald's machine
      LocalisationRequestInterceptor,
      ContextSwitchingRequestInterceptor,
      getLocation.GetLocationRequestInterceptor
    )
    .addResponseInterceptors(
    // DelegateDirectiveResponseInterceptor
    // getLocation.DelegateToGetLocationResponseInterceptor
  )
    .withApiClient(new Alexa.DefaultApiClient())
    .addErrorHandlers(ErrorHandler)
    .withCustomUserAgent("BigDino")
    .withPersistenceAdapter(
      new dynamoDbPersistenceAdapter.DynamoDbPersistenceAdapter({
        tableName: 'sac311table',
        createTable: true,
        dynamoDBClient: ddbClient
      })
    )
    .lambda();
} else { // Alexa-Hosted
  exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ReportAnIssueIntentHandler,
    getLocation.GetLocationIntentHandler,
    getLocation.YesUseCurrentLocationIntentHandler,
    getLocation.NoUseCurrentLocationIntentHandler,
    getLocation.YesUseHomeAddressIntentHandler,
    getLocation.NoUseHomeAddressIntentHandler,
    getLocation.GetLocationHelperIntentHandler,
    liveAgent.LiveAgentIntentHandler,
    abandonedVehicle.AbandonedVehicleIntentHandler,
    abandonedVehicle.YesAbandonedVehicleIntentHandler,
    abandonedVehicle.YesAbandonedVehicleTimeIntentHandler,
    abandonedVehicle.NoAbandonedVehicleIntentHandler,
    abandonedVehicle.NoAbandonedVehicleTimeIntentHandler,
    homelessCamp.HomelessCampIntentHandler,
    homelessCamp.YesHomelessCampIntentHandler,
    homelessCamp.NoHomelessCampIntentHandler,
    potHole.PotHoleRequestHandler,
    petcomplaint.petcomplaintHandler,
    trashpickup.TrashPickUpIntentHandler,
    strayAnimal.strayAnimalHandler,
    dirtyBathroom.dirtyBathroomHandler,
    YesRetryIntentHandler,
    NoRetryIntentHandler,
    FallbackIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    // IntentReflectorHandler,
  )
  .addRequestInterceptors(
    // NewSessionRequestInterceptor,
    // PersonalizationRequestInterceptor, //FIXME: Fix whatever was happening on ronald's machine
    LocalisationRequestInterceptor,
    ContextSwitchingRequestInterceptor,
    getLocation.GetLocationRequestInterceptor
  )
  .addResponseInterceptors(
  // DelegateDirectiveResponseInterceptor
  // getLocation.DelegateToGetLocationResponseInterceptor
)
  .withApiClient(new Alexa.DefaultApiClient())
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent("BigDino")
  .withPersistenceAdapter(
    new dynamoDbPersistenceAdapter.DynamoDbPersistenceAdapter({
      tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
      createTable: false,
      dynamoDBClient: new AWS.DynamoDB({apiVersion: 'latest', region: process.env.DYNAMODB_PERSISTENCE_REGION})
    })
  )
  .lambda();
}

// Custom Exports
exports.setQuestion = setQuestion