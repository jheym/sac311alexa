const Alexa = require("ask-sdk-core")
const index = require("./index.js")


const HomelessCampIntentHandler = {
  canHandle(handlerInput) {
    return (Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
      && Alexa.getIntentName(handlerInput.requestEnvelope) === "HomelessCampIntent")
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const currentIntent = handlerInput.requestEnvelope.request.intent

    if (sessionAttributes.confirmedAddress) {
      currentIntent.slots.homelessCampAddress.value = sessionAttributes.confirmedAddress
    }

    if (Alexa.getDialogState(handlerInput.requestEnvelope) === "STARTED") {
      sessionAttributes.reasonForCalling = currentIntent.name // GetAddress needs this
      const speakOutput = "Just to confirm, are you reporting about a homeless camp?"
      index.setQuestion(handlerInput, null)
      index.setQuestion(handlerInput, 'IsHomelessCampCorrect')
      return (
        handlerInput.responseBuilder
          .withShouldEndSession(false)
          .speak(speakOutput)
          .getResponse()
      )
    }

    // TODO: Add user specified slots that are the alternative to the yes/no
    // slots which users can specify with their initial intent.
    if (Alexa.getDialogState(handlerInput.requestEnvelope) === "IN_PROGRESS") {
      return (
        handlerInput.responseBuilder
          .addDelegateDirective(currentIntent)
          .getResponse()
      )
    }
    if (Alexa.getDialogState(handlerInput.requestEnvelope) === "COMPLETED") {
      var homelessCamp = Alexa.getSlotValue(handlerInput.requestEnvelope, 'homelessCamp')
      var propertyType = Alexa.getSlotValue(handlerInput.requestEnvelope, 'propertyType')
      var numPeople = Alexa.getSlotValue(handlerInput.requestEnvelope, 'numPeople')
      var address = Alexa.getSlotValue(handlerInput.requestEnvelope, 'homelessCampAddress')
      speakOutput = `Thank you for reporting the ${homelessCamp} with ${numPeople} people on ${propertyType} at ${address}. \
      We will dispatch someone to the incident as soon as we can.`

      // If isTrash is TRUE, chain into trashpickupintent 
      if (currentIntent.slots.isTrash.resolutions.resolutionsPerAuthority[0].values[0].value.id === 'TRUE') {
        return (
          handlerInput.responseBuilder
            .addDelegateDirective({
              name: 'TrashPickupIntent',
              confirmationStatus: 'NONE',
              slots: {
                trashType: {
                  name: 'trashType',
                  value: null,
                  confirmationStatus: 'NONE'
                }
              }
            })
            .speak(speakOutput + ' We just need a little more information about the trash.')
            .getResponse()
        )
      } else {
        // index.setQuestion(handlerInput, 'AnythingElse') // TODO: Make yesno intent for this
        return (
          handlerInput.responseBuilder
            .speak(speakOutput + ' Is there anything else I can help with?')
            .withShouldEndSession(false) // Replace this later to go back to welcome message optionally
            .getResponse()
        )
      }
    }
  },
}

const YesHomelessCampIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsHomelessCampCorrect')
  },
  handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput
    const sessionAttributes = attributesManager.getSessionAttributes()
    // Getting slots from the initial intent if any were included
    homelessCampSlots = sessionAttributes['HomelessCampIntent'].slots
    index.setQuestion(handlerInput, null)

    // If the user provided an address with initial intent, store the address in the userProvidedAddress property
    if (homelessCampSlots.homelessCampAddress.value) {
      sessionAttributes.userProvidedAddress = homelessCampSlots.homelessCampAddress.value
      attributesManager.setSessionAttributes(sessionAttributes)
    }

    return (
      responseBuilder
        .addDelegateDirective({
          name: 'GetAddressIntent',
          confirmationStatus: 'NONE',
          slots: {
            userAddress: {
              name: 'userAddress',
              value: homelessCampSlots.homelessCampAddress.value,
              confirmationStatus: 'NONE'
            }
          }
        })
        .getResponse()
    )
  }


}
const NoHomelessCampIntentHandler = {
  canHandle(handlerInput) {
    return (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsHomelessCampCorrect')

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
module.exports = { HomelessCampIntentHandler, YesHomelessCampIntentHandler, NoHomelessCampIntentHandler }
