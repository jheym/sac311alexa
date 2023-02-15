/* *
 * 🚨 This is the main file for the Sacramento 311 Alexa Skill 📞
 * Written by Andy Chung, Rayman Thandi, Ronald Her, Mico Barcelona, Alexa Carrell, Ethan Borg, 
 * Humayoon Rafei, and Justin Heyman
 * Dinosaur Game 💪
 * */

// TODO: Prevent the reflector handler from being triggered if it is a yes/no
// intent and instead direct it to the fallback intent

//  TODO: Create "anythingElse?" YesNo intents to handle the "anything else?" question


const Alexa = require("ask-sdk")
// const AWS = require("aws-sdk");
// const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
// const dbHelper = require('./dbHelper');





const strayAnimal = require("./strayAnimal.js")
const abandonedVehicle = require("./abandoned-vehicle.js")
const potHole = require("./pothole.js")
const petcomplaint = require("./petcomplaint.js")
const homelessCamp = require("./homeless-encampment.js")
const getLocation = require("./getLocation")
const dirtyBathroom = require("./dirty-bathroom.js")
const trashpickup = require("./trash-pickup.js")
const liveAgent = require("./liveAgent.js")

// Stows the asked question in a session attribute for yes and no intent handlers
function setQuestion(handlerInput, questionAsked) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  sessionAttributes.questionAsked = questionAsked;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    )
  },
  async handle(handlerInput) {
    // const attributesManager = handlerInput.attributesManager;
    // const attributes = await attributesManager.getPersistentAttributes() || {};
    // console.log('attributes is: ', attributes);
    // dbHelper.credentials().then((result) => {
    //   console.log(result)
    // })
    // const counter = attributes.hasOwnProperty('counter') ? attributes.counter : 0;

    return (
      handlerInput.responseBuilder
        .speak(`Thank you for contacting Sacramento Three One One. How can I help you today?`)
        .reprompt("How can I help? You can report an issue, or you can get information about city-related activities.")
        .getResponse()
    )
  },
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
    const speakOutput = "Alright. What's the issue you're reporting?"
    return (
      handlerInput.responseBuilder
        .speak(speakOutput)
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
        .speak("Alright, what can I do for you?")
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
        .speak("Understood. Thank you for contacting Sacramento three one one. Goodbye!")
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
    const speakOutput = "You can say hello to me! How can I help?"

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
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
    const speakOutput = "Goodbye!"

    return handlerInput.responseBuilder.speak(speakOutput).getResponse()
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
    const speakOutput = "Sorry, I don't know about that. Please try again."

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
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
    // const attributesManager = handlerInput.attributesManager;
    // let attributes = { "counter": 10 };

    // attributesManager.setPersistentAttributes(attributes);
    // await attributesManager.savePersistentAttributes();

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
 * */
const ErrorHandler = {
  canHandle() {
    return true
  },
  handle(handlerInput, error) {
    const speakOutput =
      "Sorry, I had trouble doing what you asked. Please try again."
    console.log(`~~~~ Error handled ~~~~`)
    console.log(error)

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse()
  },
}


// Stores the asked question in a session attribute for yes and no intent handlers
function setQuestion(handlerInput, questionAsked) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  sessionAttributes.questionAsked = questionAsked;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

// TODO: Create an interceptor that checks if the current intent has empty
// slots that can be filled from sessionAttributes
const ContextSwitchingRequestInterceptor = {
  process(handlerInput) {
    const { requestEnvelope, attributesManager } = handlerInput
    const currentIntent = requestEnvelope.request.intent

    if (requestEnvelope.request.type === 'IntentRequest'
      && requestEnvelope.request.dialogState !== 'COMPLETED') {
      const sessionAttributes = attributesManager.getSessionAttributes();

      // If there are no session attributes we've never entered dialog
      // management for this intent before 
      if (sessionAttributes[currentIntent.name]) {
        let savedSlots = sessionAttributes[currentIntent.name].slots

        for (let key in savedSlots) {
          // The current intent's slot values take precedence over saved slots
          if (!currentIntent.slots[key].value && savedSlots[key].value) {
            currentIntent.slots[key] = savedSlots[key]
          }
        }
      }

      sessionAttributes[currentIntent.name] = currentIntent
      attributesManager.setSessionAttributes(sessionAttributes)
    }
  }
}

//TODO: Probably don't get the address unless we need to.
const NewSessionRequestInterceptor = {
  async process(handlerInput) {
    // console.log('request:', JSON.stringify(handlerInput.requestEnvelope.request));



    if (handlerInput.requestEnvelope.session.new) {



      const { attributesManager } = handlerInput;
      const attributes = await attributesManager.getPersistentAttributes() || {};



    }
  }
}

// Not sure this is ever needed since we should always just send the delegate slots from the session attributes?
const DelegateDirectiveResponseInterceptor = {
  process(handlerInput, response) {
    // If there is a delegate directive in the response, replace it with any
    // saved slots for the intent being delegated
    console.log(response)


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

async function createDB() {
  const STS = new AWS.STS({ apiVersion: '2011-06-15' });
  const credentials = await STS.assumeRole({
    RoleArn: 'arn:aws:iam::020485550387:role/311DynamoDB',
    RoleSessionName: '311dbSession' // You can rename with any name
  }, (err, res) => {
    if (err) {
      console.log('AssumeRole FAILED: ', err);
      throw new Error('Error while assuming role');
    }
    return res;
  }).promise();

  const creds = createDB();

  // 2. Make a new DynamoDB instance with the assumed role credentials
  //    and scan the DynamoDB table
  // const dynamoDB = new AWS.DynamoDB({
  //   apiVersion: 'latest',
  //   region: 'us-east-1',
  //   accessKeyId: credentials.Credentials.AccessKeyId,
  //   secretAccessKey: credentials.Credentials.SecretAccessKey,
  //   sessionToken: credentials.Credentials.SessionToken
  // });
  // const tableData = await dynamoDB.scan({ TableName: 'sac311table' }, (err, data) => {
  //   if (err) {
  //     console.log('Scan FAILED', err);
  //     throw new Error('Error while scanning table');
  //   }
  //   return data;
  // }).promise();

  // ... Use table data as required ...
}

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom
 * */
// TODO: Add all handlers to an array https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/issues/283
exports.handler = Alexa.SkillBuilders.standard()
  .addRequestHandlers(  // Order matters with these!
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
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
   // IntentReflectorHandler,
  )
  .addRequestInterceptors(
    // NewSessionRequestInterceptor,
    ContextSwitchingRequestInterceptor,
    getLocation.GetLocationRequestInterceptor
  )
  .addResponseInterceptors(
  // DelegateDirectiveResponseInterceptor
  // getLocation.DelegateToGetLocationResponseInterceptor
)
  .addErrorHandlers(ErrorHandler)
  // .withApiClient(new Alexa.DefaultApiClient())
  .withCustomUserAgent("DinosaurWithGrowingPains")
  // .withPersistenceAdapter(
  //   new ddbAdapter.DynamoDbPersistenceAdapter({
  //     tableName: 'sac311table',
  //     createTable: false,
  //     dynamoDBClient: new AWS.DynamoDB({
  //       apiVersion: 'latest',
  //       region: 'us-east-1',
  // accessKeyId: credentials.Credentials.AccessKeyId,
  // secretAccessKey: credentials.Credentials.SecretAccessKey,
  // sessionToken: credentials.Credentials.SessionToken
  // })
  // })
  // )
  // .withTableName('sac311table')
  // .withAutoCreateTable(true)
  .lambda();

// Custom Exports
exports.setQuestion = setQuestion