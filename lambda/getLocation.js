const Alexa = require('ask-sdk-core')

const index = require('./index.js')
// TODO: Add getting device geolocation
// Gets an address or prompts for an address and then confirms the address is correct
    const GetLocationIntentHandler = {
      canHandle(handlerInput) {
        return (
          Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
          && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetLocationIntent'
        )
      },
      handle(handlerInput) {
        const { responseBuilder, requestEnvelope, attributesManager } = handlerInput
        const sessionAttributes = attributesManager.getSessionAttributes()
        if (Alexa.getSlot(requestEnvelope, 'location') &&
            Alexa.getSlot(requestEnvelope, 'location').confirmationStatus !== 'CONFIRMED') {
            console.log('The location slot is filled but unconfirmed')
            let location = Alexa.getSlotValue(requestEnvelope, 'location')
            let helperLocation = 
            console.log("location: " + location)
            return responseBuilder
              .addDelegateDirective({
                name: 'GetLocationHelperIntent',
                confirmationStatus: 'NONE',
                slots: {
                  helperLocation: {
                    name: 'helperLocation',
                    value: location, // FIXME: This doesn't work because it is filling the only slot it needs to delegate for
                    confirmationStatus: 'NONE'
                  }
                }
              })
              .getResponse();
        }
        
        // If the location slot is empty.
        if (!Alexa.getSlotValue(requestEnvelope, 'location')) {
          
          if (!(sessionAttributes.GetLocation && sessionAttributes.GetLocation.Geolocation &&sessionAttributes.GetLocation.asc)) {
            var speakOutput = handlerInput.t('LOCATION_GET_ADDRESS')
            index.setQuestion(handlerInput, null)
            return handlerInput.responseBuilder
              .addDelegateDirective({
              name: 'GetLocationHelperIntent',
              confirmationStatus: 'NONE',
              slots: {
                helperLocation: {
                  name: 'helperLocation',
                  value: null,
                  confirmationStatus: 'NONE'
                }
              }
            })
            .speak(handlerInput.t('LOCATION_GET_LOCATION'))
            .withShouldEndSession(false)
            .reprompt(handlerInput.t('GENERIC_REPROMPT'))
            .getResponse();
          } 
    
    
          if (sessionAttributes.GetLocation && sessionAttributes.GetLocation.Geolocation) {
            var speakOutput = handlerInput.t('LOCATION_USE_CURRENT')
            index.setQuestion(handlerInput, null)
            index.setQuestion(handlerInput, 'UseCurrentLocation?')
            return responseBuilder
              .speak(speakOutput)
              .withShouldEndSession(false)
              .getResponse();
          }
    
          if (sessionAttributes.GetLocation && sessionAttributes.GetLocation.asc) {
            var speakOutput = handlerInput.t('LOCATION_USE_HOME')
            index.setQuestion(handlerInput, null)
            index.setQuestion(handlerInput, 'UseHomeAddress?')
            return responseBuilder
              .speak(speakOutput)
              .withShouldEndSession(false)
              .getResponse();
          }
    
        }
      
              
          
    
          if (Alexa.getSlot(requestEnvelope, 'location') &&
            Alexa.getSlot(requestEnvelope, 'location').confirmationStatus === 'CONFIRMED') {
            // It is up to the original intent to add this confirmedAddress to its
            // own address slot, if necessary.
            sessionAttributes.confirmedLocation = Alexa.getSlotValue(requestEnvelope, 'location')
            const reasonForCalling = sessionAttributes.reasonForCalling
            let tempSlots = sessionAttributes[reasonForCalling].slots
            attributesManager.setSessionAttributes(sessionAttributes)
            index.setQuestion(handlerInput, null) // TODO: Temp fix because of line 197
            console.log(sessionAttributes.questionAsked) 
            // FIXME: If all slots are filled in initial intent, this fails for
            // some reason? UPDATE: The workaround was to add an intent
            // confirmation in the dialog model. Is this the only way?
            return (
              handlerInput.responseBuilder
                .addDelegateDirective({
                  name: reasonForCalling,
                  confirmationStatus: 'NONE',
                  slots: tempSlots
                })
                .withShouldEndSession(false)
                .getResponse()
       );
    }
  },
}

//   if (Alexa.getDialogState(requestEnvelope) !== 'COMPLETED') {
//     return (
//       responseBuilder
//         .addDelegateDirective()
//         .getResponse()
//     )
//   }

//   // If the user provided the address with the initial intent, store it in sessionAttributes
//   if (Alexa.getDialogState(requestEnvelope) === 'COMPLETED') {
//     // Storing the confirmed address in session attributes. The delegated intent handlers must update their slot value to this value
//     sessionAttributes.confirmedAddress = Alexa.getSlotValue(requestEnvelope, 'userAddress')
//     attributesManager.setSessionAttributes(sessionAttributes)
//     return (
//       responseBuilder
//         .addDelegateDirective({
//           name: reasonForCalling,
//           confirmationStatus: 'NONE',
//           slots: sessionAttributes[reasonForCalling].slots
//         })
//         .getResponse()
//     )
//   }
// }
// }

const YesUseCurrentLocationIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'UseCurrentLocation?'
    )
  },
  handle(handlerInput) {
    const { responseBuilder, attributesManager } = handlerInput
    const sessionAttributes = attributesManager.getSessionAttributes()
    var location = sessionAttributes.GetLocation && sessionAttributes.GetLocation.Geolocation
    index.setQuestion(handlerInput, null)
    // TODO: What happens if geolocation is null?

    return (
      responseBuilder
        .addDelegateDirective({
          name: 'GetLocationIntent',
          confirmationStatus: 'NONE',
          slots: {
            location: {
              name: 'location',
              value: location.coordinate.latitudeInDegrees + ' ' + location.coordinate.longitudeInDegrees,
              confirmationStatus: 'CONFIRMED' // No need to have user confirm their geolocation coordinates
            }
          }
        })
        .getResponse()
    )
  }
}

const NoUseCurrentLocationIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'UseCurrentLocation?'
    )
  },
  handle(handlerInput) {
    const { responseBuilder, attributesManager } = handlerInput
    const sessionAttributes = attributesManager.getSessionAttributes()
    index.setQuestion(handlerInput, null)

    // If there's a home address
    if (sessionAttributes.GetLocation && sessionAttributes.GetLocation.asc) {
      index.setQuestion(handlerInput, 'UseHomeAddress?')
      return responseBuilder
        .speak(handlerInput.t('LOCATION_USE_HOME'))
        .withShouldEndSession(false)
        .getResponse();
    } else {
      return responseBuilder
        .addDelegateDirective({
          name: 'GetLocationHelperIntent',
          confirmationStatus: 'NONE',
          slots: {
            helperLocation: {
              name: 'helperLocation',
              value: null,
              confirmationStatus: 'NONE'
            }
          }
        })
        .speak(handlerInput.t('LOCATION_GET_LOCATION'))
        .withShouldEndSession(false)
        .reprompt(handlerInput.t('GENERIC_REPROMPT'))
        .getResponse();
    }
  },
}

const YesUseHomeAddressIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'UseHomeAddress?'
    )
  },
  handle(handlerInput) {
    index.setQuestion(handlerInput, null) // TODO: Why isn't the quesionAsked attribute being cleared here?
    // console.log(sessionAttributes.questionAsked) // FIXME: ReferenceError: Cannot access 'sessionAttributes' before initialization
    const { responseBuilder, attributesManager } = handlerInput
    const sessionAttributes = attributesManager.getSessionAttributes()
    var address = sessionAttributes.GetLocation && sessionAttributes.GetLocation.asc &&
      sessionAttributes.GetLocation.asc.address;
    var postalCode = sessionAttributes.GetLocation && sessionAttributes.GetLocation.asc &&
      sessionAttributes.GetLocation.asc.postalCode;
    console.log(address + ' ' + postalCode)
    let location = address + ' ' + postalCode

    
    // TODO: What happens if locationObj is null?
    // TODO: Run address against ESRI

    return responseBuilder
      .addDelegateDirective({
        name: 'GetLocationIntent',
        confirmationStatus: 'NONE',
        slots: {
          location: {
            name: 'location',
            value: location,
            confirmationStatus: 'CONFIRMED'
          }
        }
      })
      .getResponse();
  }
}


const NoUseHomeAddressIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'UseHomeAddress?'
    )
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .addDelegateDirective({
        name: 'GetLocationHelperIntent',
        confirmationStatus: 'NONE',
        slots: {
          helperLocation: {
            name: 'helperLocation',
            value: null,
            confirmationStatus: 'NONE'
          }
        }
      })
      .speak(handlerInput.t('LOCATION_GET_LOCATION'))
      .withShouldEndSession(false)
      .reprompt(handlerInput.t('GENERIC_REPROMPT'))
      .getResponse();
  }
}

/**
 * AMAZON.SearchQuery slot types seem to only work with "required" slots. With
 * this intent handler, the location slot in the main intent can remain an
 * "optional" slot, which is required for manual dialog control.
 */
const GetLocationHelperIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetLocationHelperIntent'
    );
  },
  handle(handlerInput) {
    const { requestEnvelope, responseBuilder } = handlerInput

    if (Alexa.getSlot(handlerInput.requestEnvelope, 'helperLocation') &&
      Alexa.getSlot(handlerInput.requestEnvelope, 'helperLocation').confirmationStatus === 'NONE') {
      console.log('confirmationStatus is NONE')
      let location = Alexa.getSlotValue(requestEnvelope, 'helperLocation');
      return responseBuilder
        .addConfirmSlotDirective('helperLocation')
        .speak(handlerInput.t('LOCATION_CONFIRM',{location: `${location}`}))
        .reprompt(handlerInput.t('LOCATION_CONFIRM',{location: `${location}`}))
        .getResponse();
    }

    if (Alexa.getSlot(handlerInput.requestEnvelope, 'helperLocation') &&
      Alexa.getSlot(handlerInput.requestEnvelope, 'helperLocation').confirmationStatus === 'DENIED') {
      console.log('confirmationStatus is DENIED')
      return responseBuilder
        .addDelegateDirective({
          name: 'GetLocationHelperIntent',
          confirmationStatus: 'NONE',
          slots: {
            helperLocation: {
              name: 'helperLocation',
              value: null,
              confirmationStatus: 'NONE'
            }
          }
        })
        .speak(handlerInput.t('LOCATION_RETRY'))
        .getResponse();
    }

    if (Alexa.getSlot(handlerInput.requestEnvelope, 'helperLocation') &&
      Alexa.getSlot(handlerInput.requestEnvelope, 'helperLocation').confirmationStatus === 'CONFIRMED') {
      console.log('confirmationStatus is CONFIRMED')
      let location = Alexa.getSlotValue(requestEnvelope, 'helperLocation')
      return responseBuilder
        .addDelegateDirective({
          name: 'GetLocationIntent',
          confirmationStatus: 'NONE',
          slots: {
            location: {
              name: 'location',
              value: location,
              confirmationStatus: 'CONFIRMED'
            }
          }
        })
        .getResponse();
    }
  }

}

const GetLocationRequestInterceptor = {
  async process(handlerInput) {
    const { attributesManager, requestEnvelope, serviceClientFactory } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();

    if (requestEnvelope.request.type === 'IntentRequest' &&
      Alexa.getIntentName(requestEnvelope) === 'GetLocationIntent' &&
      !sessionAttributes.GetLocation) {
      const consentToken = requestEnvelope.context.System.user.permissions
        && requestEnvelope.context.System.user.permissions.consentToken;
      var isGeoSupported = requestEnvelope.context.System.device.supportedInterfaces.Geolocation;
      sessionAttributes.GetLocation = {};

      if (!consentToken) {
        console.log('The user has not given any permissions');
      }

      if (isGeoSupported) {
        if (requestEnvelope.context.Geolocation) {
          sessionAttributes.GetLocation.Geolocation = requestEnvelope.context.Geolocation;
        }
      }

      // Getting the home address associated with the user, if it exists
      try {
        const { deviceId } = requestEnvelope.context.System.device;
        const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
        // This is why the function is async. We wait for a response from the
        // serviceClient API before executing the next line of code.
        // TODO: Add timeout for asc and continue if no response
        const address = await deviceAddressServiceClient.getFullAddress(deviceId);  // This is an API call to the ASC

        if (address.addressLine1 === null && address.stateOrRegion === null) {
          console.log('The user does not have an address set.')
        } else {
          sessionAttributes.GetLocation.asc = {}
          sessionAttributes.GetLocation.asc.address = address.addressLine1;
          sessionAttributes.GetLocation.asc.stateOrRegion = address.stateOrRegion;
          sessionAttributes.GetLocation.asc.postalCode = address.postalCode;
          console.log('The address has been stored in session attributes.');
        }
      } catch (error) {
        if (error.name !== 'ServiceError') {
          console.log('Something went wrong.')
        }
        console.log('There was a service error getting the address ~~~~~\n', error)
      }
      attributesManager.setSessionAttributes(sessionAttributes);
    }
  }
}

/** 
 * If any intent is delegating to GetAddressIntent, this interceptor will modify the response before it goes out
 **/
const DelegateToGetLocationResponseInterceptor = {
  async process(handlerInput, response) {
    if (response && response.directives && response.directives[0].updatedIntent && response.directives[0].updatedIntent.name === 'GetLocationIntent' &&
      response.directives[0].type === 'Dialog.Delegate') {

      const { attributesManager, requestEnvelope, serviceClientFactory } = handlerInput
      const sessionAttributes = attributesManager.getSessionAttributes()

      // If a GetLocation field already exists then this does not need to run again
      if (!sessionAttributes.GetLocation) {
        const consentToken = requestEnvelope.context.System.user.permissions
          && requestEnvelope.context.System.user.permissions.consentToken
        var isGeoSupported = requestEnvelope.context.System.device.supportedInterfaces.Geolocation
        sessionAttributes.GetLocation = {}

        if (!consentToken) {
          console.log('The user has not given any permissions')
        }

        if (isGeoSupported) {
          if (requestEnvelope.context.Geolocation) {
            sessionAttributes.GetLocation.Geolocation = requestEnvelope.context.Geolocation;
          }
        }

        // Getting the home address associated with the user, if it exists
        try {
          const { deviceId } = requestEnvelope.context.System.device;
          const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
          // This is why the function is async. We wait for a response from the
          // serviceClient API before executing the next line of code.
          // TODO: Add timeout for asc and continue if no response
          const address = await deviceAddressServiceClient.getFullAddress(deviceId);  // This is an API call to the ASC

          if (address.addressLine1 === null && address.stateOrRegion === null) {
            console.log('The user does not have an address set.')
          } else {
            sessionAttributes.GetLocation.asc = {}
            sessionAttributes.GetLocation.asc.address = address.addressLine1;
            sessionAttributes.GetLocation.asc.stateOrRegion = address.stateOrRegion;
            sessionAttributes.GetLocation.asc.postalCode = address.postalCode;
            console.log('The address has been stored in session attributes.');
          }
        } catch (error) {
          if (error.name !== 'ServiceError') {
            console.log('Something went wrong.')
          }
          console.log('There was a service error getting the address ~~~~~\n', error)
        }
        attributesManager.setSessionAttributes(sessionAttributes);
      }
    }
  }

  // clear the current response object
  // for (let key in response) {
  //   delete response[key]
  // }
  // // This is how to build a custom response from scratch in a response interceptor
  // response.outputSpeech = {}
  // response.outputSpeech.type = "PlainText"
  // response.outputSpeech.text = "Would you like to use your current location for the address of your report?"
  // response.outputSpeech.playBehavior = "REPLACE_ENQUEUED"
  // response.shouldEndSession = false
  // response.reprompt = {}
  // response.reprompt.outputSpeech = {}
  // response.reprompt.outputSpeech.type = "PlainText"
  // response.reprompt.outputSpeech.text = "Would you like to use your current location for the address of your report?"
  // index.setQuestion(handlerInput, null)
  // index.setQuestion(handlerInput, 'UseCurrentLocation')
}


module.exports = {
  GetLocationIntentHandler,
  YesUseCurrentLocationIntentHandler,
  NoUseCurrentLocationIntentHandler,
  YesUseHomeAddressIntentHandler,
  NoUseHomeAddressIntentHandler,
  GetLocationHelperIntentHandler,
  // DelegateToGetLocationResponseInterceptor,
  GetLocationRequestInterceptor,
}