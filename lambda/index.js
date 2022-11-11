/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require("ask-sdk-core")

const abandonedVehicle = require("./abandoned-vehicle.js")
const potHole = require("./pothole.js")
const petcomplaint = require("./petcomplaint.js")


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

const YesIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked !== null
    )
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent
    if (handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedVehicleCorrect') {
      setQuestion(handlerInput, null)
      setQuestion(handlerInput, 'IsAbandonedTime')
      return (
        handlerInput.responseBuilder
          .speak('Has the vehicle been abandoned for more than seventy-two hours?')
          .withShouldEndSession(false)
          .getResponse()
      )
    }

    if (handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedTime') {
      setQuestion(handlerInput, null) // Remember to clear the questionAsked field for other y/n questions in same session
      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
      tempSlots = sessionAttributes['ConfirmAbandonedVehicleIntent'].slots
      return (
        handlerInput.responseBuilder
          .addDelegateDirective({ // This is what intent chaining looks like https://developer.amazon.com/en-US/blogs/alexa/alexa-skills-kit/2019/03/intent-chaining-for-alexa-skill
            name: 'AbandonedVehicleIntent',
            confirmationStatus: 'NONE',
            slots: { // Adding slots that may have been collected by ConfirmAbandonedVehicleIntent
              make: {
                name: 'make',
                value: tempSlots.make.value,
                confirmationStatus: 'NONE'
              },
              model: {
                name: 'model',
                value: tempSlots.model.value,
                confirmationStatus: 'NONE'
              },
              color: {
                name: 'color',
                value: tempSlots.color.value,
                confirmationStatus: 'NONE'
              }
            }
          })
          .getResponse()
      )
    }

    if (handlerInput.attributesManager.getSessionAttributes().questionAsked === 'TryAgain') {
      setQuestion(handlerInput, null) // Remember to clear the questionAsked field for other y/n questions in same session
      return (
        handlerInput.responseBuilder
          .speak("Alright, what can I do for you?")
          .withShouldEndSession(false)
          .getResponse()
      )
    }

  },
}

const NoIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked !== null
    )
  },
  handle(handlerInput) {
    if (handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedVehicleCorrect') {
      setQuestion(handlerInput, null)
      setQuestion(handlerInput, 'TryAgain')
      return (
        handlerInput.responseBuilder
          .speak("Sorry about that. If you try phrasing your issue differently, I may be able to understand. I'll wait.")
          .reprompt("I'm still here. Do you want to try reporting your issue again?")
          .withShouldEndSession(false) // This prevents the skill from ending the session
          .getResponse()
      )
    }

    if (handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedTime') {
      setQuestion(handlerInput, null)
      setQuestion(handlerInput, 'TryAgain')
      return (
        handlerInput.responseBuilder
          .speak("Unfortunately we cannot take action until the vehicle has been abandoned for more than 72 hours. \
          Is there anything else I can help you with?")
          .withShouldEndSession(false) // This prevents the skill from ending the session
          .getResponse()
      )
    }

    // If the user does not wish to try rephrasing their intent.
    if (handlerInput.attributesManager.getSessionAttributes().questionAsked === 'TryAgain') {
      setQuestion(handlerInput, null)
      return (
        handlerInput.responseBuilder
          .speak("Understood. Thank you for contacting Sacramento three one one. Goodbye!")
          .withShouldEndSession(true) // This will end the session
          .getResponse()
      )
    }
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
    console.log(
      `~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`
    )
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
    potHole.PotHoleRequestHandler,
    petcomplaint.petcomplaintHandler,
    YesIntentHandler,
    NoIntentHandler,
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