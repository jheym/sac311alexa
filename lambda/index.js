/* *
 * 🚨 This is the main file for the Sacramento 311 Alexa Skill 📞
 * Written by Andy Chung, Rayman Thandi, Ronald Her, Mico Barcelona Alexa Carrell, Ethan Borg, 
 * Humayoon Rafei, and Justin Heyman
 * Dinosaur Game 💪
 * */
const Alexa = require("ask-sdk-core")

const abandonedVehicle = require("./abandoned-vehicle.js")
const potHole = require("./pothole.js")
const petcomplaint = require("./petcomplaint.js")
const homelessCamp = require("./homeless-encampment.js")

const trashpickup = require("./trash-pickup.js")

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
  handle(handlerInput) {
    return (
      handlerInput.responseBuilder
        .speak("Thank you for contacting Sacramento Three One One. How can I help you today?")
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
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet
 * */
const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
      "AMAZON.FallbackIntent"
    )
  },
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
  handle(handlerInput) {
   // console.log(
   //   `~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`
  //  )
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse() // notice we send an empty response
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
    console.log(`~~~~ Error handled: ${JSON.stringify(error)}`)

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse()
  },
}


/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom
 * */
// TODO: Add all handlers to an array https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/issues/283
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(  // Order matters with these!
    LaunchRequestHandler,
    ReportAnIssueIntentHandler,
    abandonedVehicle.ConfirmAbandonedVehicleIntentHandler,
    abandonedVehicle.AbandonedVehicleIntentHandler,
    abandonedVehicle.YesAbandonedVehicleIntentHandler,
    abandonedVehicle.YesAbandonedVehicleTimeIntentHandler,
    abandonedVehicle.NoAbandonedVehicleIntentHandler,
    abandonedVehicle.NoAbandonedVehicleTimeIntentHandler,
   // homelessCamp.ConfirmHomelessEncampmentIntentHandler,
    homelessCamp.HomelessCampIntentHandler,
    homelessCamp.YesHomelessCampIntentHandler,
    homelessCamp.NoHomelessCampIntentHandler,
    potHole.PotHoleRequestHandler,
    petcomplaint.petcomplaintHandler,
    trashpickup.TrashPickUpIntentHandler,
    YesRetryIntentHandler,
    NoRetryIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent("DinosaurWithGrowingPains")
  .lambda()

// Custom Exports
exports.setQuestion = setQuestion