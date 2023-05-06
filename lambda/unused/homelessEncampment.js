const Alexa = require("ask-sdk-core")
const helper = require("../helper/helperFunctions.js")

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
      const speakOutput = handlerInput.t('HOMELESS_CONFIRMATION')
      helper.setYNQuestion(handlerInput, null)
      helper.setYNQuestion(handlerInput, 'IsHomelessCampCorrect')
      return (
        handlerInput.responseBuilder
          .withShouldEndSession(false)
          .speak(speakOutput)
          .getResponse()
      )
    }

    // TODO: Add user specified slots that are the alternative to the yes/no
    // slots which users can specify with their initial intent. Additionally,
    // when a user says an address with initial intent, sometimes the street
    // number resolves to the number slot instead. The number slots might need
    // to be changed because it doesn't accept anything other than a straight
    // number, so people can't say "about 4" or something similar.
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
      var location = sessionAttributes.confirmedLocation;

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
            .speak(handlerInput.t('HOMELESS_THANKS_CONTINUATION',{homelessCamp: `${homelessCamp}`, numPeople: `${numPeople}`, propertyType: `${propertyType}`, location: `${location}`}))
            .withShouldEndSession(false)
            .getResponse()
        )
      } else {
        helper.setYNQuestion(handlerInput, null)
        helper.setYNQuestion(handlerInput, 'AnythingElse?')
        console.log(sessionAttributes.ynQuestionAsked)
        return (
          handlerInput.responseBuilder
            .speak(handlerInput.t('HOMELESS_THANKS',{homelessCamp: `${homelessCamp}`, numPeople: `${numPeople}`, propertyType: `${propertyType}`, location: `${location}`}))
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
      && handlerInput.attributesManager.getSessionAttributes().ynQuestionAsked === 'IsHomelessCampCorrect')
  },
  handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput
    const sessionAttributes = attributesManager.getSessionAttributes()
    // Getting slots from the initial intent if any were included
    homelessCampSlots = sessionAttributes['HomelessCampIntent'].slots
    helper.setYNQuestion(handlerInput, null)

    // // If the user provided an address with initial intent, store the address in the userProvidedAddress property
    // if (homelessCampSlots.homelessCampAddress.value) {
    //   sessionAttributes.userProvidedAddress = homelessCampSlots.homelessCampAddress.value
    //   attributesManager.setSessionAttributes(sessionAttributes)
    // }

    return (
      responseBuilder
        .addDelegateDirective({
          name: 'GetLocationIntent',
          confirmationStatus: 'NONE',
          slots: {}
        })
        .getResponse()
    )
  }


}
const NoHomelessCampIntentHandler = {
  canHandle(handlerInput) {
    return (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
      && handlerInput.attributesManager.getSessionAttributes().ynQuestionAsked === 'IsHomelessCampCorrect')

  },
  handle(handlerInput) {
    helper.setYNQuestion(handlerInput, null)
    helper.setYNQuestion(handlerInput, 'TryAgain')
    return (
      handlerInput.responseBuilder
        .speak(handlerInput.t('UNKNOWN_MSG'))
        .reprompt(handlerInput.t('UNKNOWN_MSG_REPROMPT'))
        .withShouldEndSession(false) // This prevents the skill from ending the session
        .getResponse()
    )
  }

}
module.exports = { HomelessCampIntentHandler, YesHomelessCampIntentHandler, NoHomelessCampIntentHandler }
