const Alexa = require('ask-sdk-core')

const index = require('./index.js')

// Gets an address or prompts for an address and then confirms the address is correct
const GetAddressIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetAddressIntent'
    )
  },
  handle(handlerInput) {
    const { responseBuilder, requestEnvelope, attributesManager } = handlerInput
    const sessionAttributes = attributesManager.getSessionAttributes()
    const reasonForCalling = sessionAttributes.reasonForCalling

    if (Alexa.getDialogState(requestEnvelope) !== 'COMPLETED') {
      return (
        responseBuilder
          .addDelegateDirective()
          .getResponse()
      )
    }

    // If the user provided the address with the initial intent, store it in sessionAttributes
    if (Alexa.getDialogState(requestEnvelope) === 'COMPLETED') {
      // Storing the confirmed address in session attributes. The delegated intent handlers must update their slot value to this value
      sessionAttributes.confirmedAddress = Alexa.getSlotValue(requestEnvelope, 'userAddress')
      attributesManager.setSessionAttributes(sessionAttributes)
      return (
        responseBuilder
          .addDelegateDirective({
            name: reasonForCalling,
            confirmationStatus: 'NONE',
            slots: sessionAttributes[reasonForCalling].slots
          })
          .getResponse()
      )
    }
  }
}

const YesUseCurrentLocationHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'UseCurrentLocation'
    )
  },
  handle(handlerInput) {
    const { responseBuilder, attributesManager } = handlerInput
    sessionAttributes = attributesManager.getSessionAttributes()
    let address = sessionAttributes.asc.address
    // TODO: Turn "APT" into "apartment"
    index.setQuestion(handlerInput, null)

    return (
      responseBuilder
        .addDelegateDirective({
          name: 'GetAddressIntent',
          confirmationStatus: 'NONE',
          slots: {
            userAddress: {
              name: 'userAddress',
              value: address,
              confirmationStatus: 'NONE'
            }
          }
        })
        .getResponse()
    )
  }
}

const NoUseCurrentLocationHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'UseCurrentLocation'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null)
    return (
      handlerInput.responseBuilder
        .addDelegateDirective({
          name: 'GetAddressIntent',
          confirmationStatus: 'NONE',
          slots: {
            userAddress: {
              name: 'userAddress',
              value: null,
              confirmationStatus: 'NONE'
            }
          }
        })
        .getResponse()
    )
  },
}
const TryUserLocationResponseInterceptor = {
  process(handlerInput, response) {
    if (response.directives && response.directives[0].updatedIntent && response.directives[0].updatedIntent.name === 'GetAddressIntent' &&
      response.directives[0].type === 'Dialog.Delegate') {
      const { attributesManager } = handlerInput
      const sessionAttributes = attributesManager.getSessionAttributes()
      const reasonForCalling = sessionAttributes.reasonForCalling

      if (sessionAttributes.userProvidedAddress) {
        let userAddress = sessionAttributes.userProvidedAddress
        console.log(`The address was provided with the intent: ${userAddress}`)
      } else {
        console.log('The address was not provided with the intent. Ask the user if they want to use their current location.')

        // If we have an address from address service client
        if (sessionAttributes.asc.address) {
          if (sessionAttributes.userProvidedAddress) {
            // We've already executed the steps below
          } else {
            sessionAttributes.userProvidedAddress = sessionAttributes.asc.address
            // clear the response object
            for (let key in response) {
              delete response[key]
            }
            // Prepare the custom response for asking about the address
            response.outputSpeech = {}
            response.outputSpeech.type = "PlainText"
            response.outputSpeech.text = "Would you like to use your current location for the address of your report?"
            response.outputSpeech.playBehavior = "REPLACE_ENQUEUED"
            response.shouldEndSession = false
            response.reprompt = {}
            response.reprompt.outputSpeech = {}
            response.reprompt.outputSpeech.type = "PlainText"
            response.reprompt.outputSpeech.text = "Would you like to use your current location for the address of your report?"
            index.setQuestion(handlerInput, null)
            index.setQuestion(handlerInput, 'UseCurrentLocation')
          }
        } else {
          // Do nothing. The response is already delegating to GetAddressIntent
        }
      }
    }
  }
}


module.exports = { GetAddressIntentHandler, YesUseCurrentLocationHandler, NoUseCurrentLocationHandler, TryUserLocationResponseInterceptor }