
const Alexa = require("ask-sdk-core")
const index = require("./index.js")

const dbHelper = require('./dynamo-testDB.js')
var AWS = require("aws-sdk");
const tableName = "dynamodb-test";
//var dbHelper = function () { }; //ethan did this, throwing error
var docClient = new AWS.DynamoDB.DocumentClient();


const AbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
      && Alexa.getIntentName(handlerInput.requestEnvelope) === "AbandonedVehicleIntent"
    )
  },
  handle(handlerInput) {
    const { attributesManager, requestEnvelope, responseBuilder } = handlerInput
    const currentIntent = requestEnvelope.request.intent;
    const sessionAttributes = attributesManager.getSessionAttributes()

    // If confirmedAddress exists, the address has been confirmed already and we should update this intent's slot value
    if (sessionAttributes.confirmedAddress) {
      currentIntent.slots.abandonedVehicleAddress.value = sessionAttributes.confirmedAddress
    }

    if (Alexa.getDialogState(handlerInput.requestEnvelope) === "STARTED") {
      const speakOutput = "Just to confirm, are you reporting an abandoned vehicle?"
	    const userID = handlerInput.requestEnvelope.context.System.user.userId; 
	    const slots = handlerInput.requestEnvelope.request.intent.slots;
	    const response = slots.Response.value;
	
      index.setQuestion(handlerInput, null)
      index.setQuestion(handlerInput, 'IsAbandonedVehicleCorrect')
      return (				//Changing to return dbHelper.addResponse(response, userID) to save response?
        handlerInput.responseBuilder
          .withShouldEndSession(false)
          .speak(speakOutput)
          .getResponse()
      )
	/*.then((data) => {
		const speechText = 'Testing you just said ${response}. Testing';
		*/
    }

    if (Alexa.getDialogState(handlerInput.requestEnvelope) === "IN_PROGRESS") {
      return (
        handlerInput.responseBuilder
          .addDelegateDirective(currentIntent)
          .getResponse()
      )
    }

    if (Alexa.getDialogState(handlerInput.requestEnvelope) === "COMPLETED") {
      var make = Alexa.getSlotValue(handlerInput.requestEnvelope, 'make')
      var model = Alexa.getSlotValue(handlerInput.requestEnvelope, 'model')
      var color = Alexa.getSlotValue(handlerInput.requestEnvelope, 'color')
      var address = Alexa.getSlotValue(handlerInput.requestEnvelope, 'abandonedVehicleAddress')
      speakOutput = `Thank you for reporting the abandoned ${color} ${make} ${model} located near ${address}. We'll dispatch someone to the incident as soon as we can. Is there anything else I can help you with?`
      //TODO: Set question for "anything else?" 
      return (
        handlerInput.responseBuilder
          .speak(speakOutput)
          .withShouldEndSession(false) // Replace this later to go back to welcome message optionally
          .getResponse()
      )
    }
  },
}

const YesAbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedVehicleCorrect'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null)
    index.setQuestion(handlerInput, 'IsAbandonedTime')
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    sessionAttributes.reasonForCalling = 'AbandonedVehicleIntent' // So GetAddressIntent knows where to delegate back to after confirming the address
    return (
      handlerInput.responseBuilder
        .speak('Has the vehicle been abandoned for more than seventy-two hours?')
        .withShouldEndSession(false)
        .getResponse()
    )
  }
}

const YesAbandonedVehicleTimeIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedTime'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null) // Remember to clear the questionAsked field for other y/n questions in same session
    const { responseBuilder, attributesManager } = handlerInput
    const sessionAttributes = attributesManager.getSessionAttributes()
    // If the user provided an address with initial intent, store the address in the userProvidedAddress property
    if (sessionAttributes['AbandonedVehicleIntent'].slots.abandonedVehicleAddress.value) {
      sessionAttributes.userProvidedAddress = sessionAttributes['AbandonedVehicleIntent'].slots.abandonedVehicleAddress.value
    }
    attributesManager.setSessionAttributes(sessionAttributes)

    // TODO: Sending the address from here is not ideal because we also have to
    // chain into another yes/no abandoned vehicle intent to ask if the user
    // wants to use their location. That will need to be copied to all
    // modules... Maybe a response interceptor is a solution?
    return (
      responseBuilder
        .addDelegateDirective({
          name: 'GetAddressIntent',
          confirmationStatus: 'NONE',
          slots: {
            userAddress: {
              name: 'userAddress',
              value: sessionAttributes['AbandonedVehicleIntent'].slots.abandonedVehicleAddress.value,
              confirmationStatus: 'NONE'
            }
          }
        })
        .getResponse()
    )
  }
}

const NoAbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedVehicleCorrect'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null)
    index.setQuestion(handlerInput, 'TryAgain')
    return (
      handlerInput.responseBuilder
        .speak("Sorry about that. If you try phrasing your issue differently, I may be able to understand. I'll wait.")
        .reprompt("I'm still here. Do you want to try reporting your issue again?")
        .withShouldEndSession(false) // This prevents the skill from ending the session
        .getResponse()
    )
  }
}

const NoAbandonedVehicleTimeIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedTime'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null)
    index.setQuestion(handlerInput, 'TryAgain')
    return (
      handlerInput.responseBuilder
        .speak("Unfortunately we cannot take action until the vehicle has been abandoned for more than 72 hours. \
        Is there anything else I can help you with?")
        .withShouldEndSession(false) // This prevents the skill from ending the session
        .getResponse()
    )
  }
}

module.exports = {
  AbandonedVehicleIntentHandler,
  YesAbandonedVehicleIntentHandler,
  YesAbandonedVehicleTimeIntentHandler,
  NoAbandonedVehicleIntentHandler,
  NoAbandonedVehicleTimeIntentHandler
}
