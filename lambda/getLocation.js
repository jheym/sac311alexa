const Alexa = require('ask-sdk-core')
const axios = require('axios');
const helper = require("./helper/helperFunctions.js")
const format = require('./helper/formatAddress.js')
/**
 * This file handles the entire GetLocation conversation flow. Most of the logic
 * is in GetLocationIntentHandler, while the GetLocationIntentInterceptor is
 * responsible for querying geolocation and address. The GetLocationHelperIntent
 * is responsible collecting a location from the user's input.
 * 
 * For the location conversation flow design, refer to the link below:
 * https://lucid.app/lucidchart/d73b0879-d985-45df-8ce2-64a717c08ee9/edit?invitationId=inv_9bbd682a-2890-42f8-ab2f-9d018da6e42e
 */


/**
 * Uses any collected locations or hands the user off to getLocationHelper if none are found
**/
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
    
    // If the location slot is empty.
    if (!Alexa.getSlotValue(requestEnvelope, 'location')) {
      // If we found a geolocation and the user has not been prompted yet
      if (sessionAttributes.GetLocation && sessionAttributes.GetLocation.Geolocation) {
        var speakOutput = 'Do you want to use your current location?'
        helper.setQuestion(handlerInput, null)
        helper.setQuestion(handlerInput, 'UseCurrentLocation?')
        return responseBuilder
          .speak(speakOutput)
          .withShouldEndSession(false)
          .getResponse();
      } else if (sessionAttributes.GetLocation && sessionAttributes.GetLocation.asc) {
      // If we found an address and the user has not been prompted yet
        var speakOutput = 'Do you want to use your home address?'
        helper.setQuestion(handlerInput, null)
        helper.setQuestion(handlerInput, 'UseHomeAddress?')
        return responseBuilder
          .speak(speakOutput)
          .withShouldEndSession(false)
          .getResponse();
      } else {
        // If no address or geolocation were available from from the user, delegate to the GetLocationHelperIntent
        return responseBuilder
          .speak("What's the location?")
          .addDelegateDirective({
            name: 'GetLocationHelperIntent',
            confirmationStatus: 'NONE',
            slots: {
              helperLocation: {
                name: 'helperLocation',
                confirmationStatus: 'NONE'
              }
            }
          })
          .getResponse();
      }


     
    } else {
      // If the location slot is filled but unconfirmed.
      if (Alexa.getSlot(requestEnvelope, 'location') &&
        Alexa.getSlot(requestEnvelope, 'location').confirmationStatus !== 'CONFIRMED') {
        console.log('The location slot is filled but unconfirmed')
        let location = Alexa.getSlotValue(requestEnvelope, 'location')
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

      // If the location slot is filled and confirmed.
      if (Alexa.getSlot(requestEnvelope, 'location') &&
        Alexa.getSlot(requestEnvelope, 'location').confirmationStatus === 'CONFIRMED') {
        // It is up to the original intent to add this confirmedAddress to its
        // own address slot, if necessary.
        sessionAttributes.confirmedLocation = Alexa.getSlotValue(requestEnvelope, 'location')
        const reasonForCalling = sessionAttributes.reasonForCalling
        let tempSlots = sessionAttributes[reasonForCalling].slots
        attributesManager.setSessionAttributes(sessionAttributes)
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
    }
  },
}









/**
 * If the user says yes to using their current location, delegate their location
 * back to getLocation intent
 */
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
    helper.setQuestion(handlerInput, null)
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

/**
 * If the user says no to using their current location, check if we also have
 * their home address and ask if they want to use that. Else, delegate to
 * getLocationHelper
 */
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
    helper.setQuestion(handlerInput, null)

    // If there's a home address
    if (sessionAttributes.GetLocation && sessionAttributes.GetLocation.asc) {
      helper.setQuestion(handlerInput, 'UseHomeAddress?')
      return responseBuilder
        .speak('Do you want to use your home address?')
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
        .speak("What's the location?")
        .withShouldEndSession(false)
        .reprompt('Reprompt')
        .getResponse();
    }
  },
}

/**
 * If the user says yes to using their home address, delegate their address back to getLocation intent
 */
const YesUseHomeAddressIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'UseHomeAddress?'
    )
  },
  handle(handlerInput) {
    const { responseBuilder, attributesManager } = handlerInput
    const sessionAttributes = attributesManager.getSessionAttributes()
    helper.setQuestion(handlerInput, null)
    console.log(sessionAttributes.questionAsked) 
    
    var address = sessionAttributes.GetLocation && sessionAttributes.GetLocation.asc &&
      sessionAttributes.GetLocation.asc.address;
    var postalCode = sessionAttributes.GetLocation && sessionAttributes.GetLocation.asc &&
      sessionAttributes.GetLocation.asc.postalCode;
    console.log(address + ' ' + postalCode)
    let location = address + ' ' + postalCode

    
    // TODO: What happens if locationObj is null?


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
      .speak("What's the location?")
      .withShouldEndSession(false)
      .reprompt('Reprompt')
      .getResponse();
  }
}

/**
 * This intent handler prompts the user for their location and confirms it.
 *
 * Note: AMAZON.SearchQuery slot types seem to only work with "required" slots.
 * By creating a whole new separate helper intent (GetLocationHelperIntent), the
 * location slot in the main intent (GetLocationIntent) can remain an "optional"
 * slot, which is required for manual dialog control (e.g. using confirmationStatus)
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
      const addy= Alexa.getSlotValue(requestEnvelope, 'helperLocation');
      const location = format.formatInput(addy);
      return responseBuilder
        .addConfirmSlotDirective('helperLocation')
        .speak(`<speak>Is the location near <say-as interpret-as="address">${location}</say-as>?</speak>`)
        .reprompt(`<speak>Is the location near <say-as interpret-as="address">${location}</say-as>?</speak>`)
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
        .speak(`Let's try that again. What's the location?`)
        .getResponse();
    }

    if (Alexa.getSlot(handlerInput.requestEnvelope, 'helperLocation') &&
      Alexa.getSlot(handlerInput.requestEnvelope, 'helperLocation').confirmationStatus === 'CONFIRMED') {
      console.log('confirmationStatus is CONFIRMED')
      let addy = Alexa.getSlotValue(requestEnvelope, 'helperLocation')
      let location = format.formatInput(addy);
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

/**
 * Intercepts the GetLocationIntent and checks for device geolocation and/or
 * address from user contact details. If neither are present,
 * GetLocationIntentHandler will detect this and delegate to
 * GetLocationHelperIntent
 */
const GetLocationRequestInterceptor = {
  async process(handlerInput) {
    const { attributesManager, requestEnvelope, serviceClientFactory } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();

    if (requestEnvelope.request.type === 'IntentRequest' &&
      Alexa.getIntentName(requestEnvelope) === 'GetLocationIntent' &&
      !sessionAttributes.GetLocation) { // If the location has already been set, don't do anything
      
      
      var isGeoSupported = requestEnvelope.context.System.device.supportedInterfaces.Geolocation;
      
      sessionAttributes.GetLocation = {};



      if (isGeoSupported) {
        if (requestEnvelope.context.Geolocation) {
          sessionAttributes.GetLocation.Geolocation = requestEnvelope.context.Geolocation;
        }
      }

      // Getting the home address associated with the user, if it exists. If there is no address,
      try {
        const { deviceId } = requestEnvelope.context.System.device;
        const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
        // This is why the function is async. We wait for a response from the
        // serviceClient API before executing the next line of code. 
        const address = await deviceAddressServiceClient.getFullAddress(deviceId);  // This is an API call to the ASC

        if (address.addressLine1 === null && address.stateOrRegion === null) {
          console.log('The user does not have an address set.')
        } else {
          sessionAttributes.GetLocation.asc = {}
          sessionAttributes.GetLocation.asc.address = address.addressLine1;
          sessionAttributes.GetLocation.asc.stateOrRegion = address.stateOrRegion;
          sessionAttributes.GetLocation.asc.postalCode = address.postalCode;
          console.log('The address has been stored in session attributes.');
          console.log(address);
        }
      } catch (error) {
        if (error.name !== 'ServiceError') {
          console.log('Something went wrong.')
        }
        // It's okay if this reports a 403. That just means the user has not
        // enabled permissions. In that case, GetLocationIntentHandler will
        // handle it.
        console.log('There was a service error getting the address ~~~~~\n', error)
      }
      attributesManager.setSessionAttributes(sessionAttributes);
    }
  }
}

/** 
 * Not currently using this, but leaving it here in case it's needed in the
 * future. If any intent is delegating to GetAddressIntent, this interceptor
 * will modify the response before it goes out
 **/
// const DelegateToGetLocationResponseInterceptor = {
//   async process(handlerInput, response) {
//     if (response && response.directives && response.directives[0].updatedIntent && response.directives[0].updatedIntent.name === 'GetLocationIntent' &&
//       response.directives[0].type === 'Dialog.Delegate') {

//       const { attributesManager, requestEnvelope, serviceClientFactory } = handlerInput
//       const sessionAttributes = attributesManager.getSessionAttributes()

//       // If a GetLocation field already exists then this does not need to run again
//       if (!sessionAttributes.GetLocation) {
//         const consentToken = requestEnvelope.context.System.user.permissions
//           && requestEnvelope.context.System.user.permissions.consentToken
//         var isGeoSupported = requestEnvelope.context.System.device.supportedInterfaces.Geolocation
//         sessionAttributes.GetLocation = {}

//         if (!consentToken) {
//           console.log('The user has not given any permissions')
//         }

//         if (isGeoSupported) {
//           if (requestEnvelope.context.Geolocation) {
//             sessionAttributes.GetLocation.Geolocation = requestEnvelope.context.Geolocation;
//           }
//         }

//         // Getting the home address associated with the user, if it exists
//         try {
//           const { deviceId } = requestEnvelope.context.System.device;
//           const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
//           // This is why the function is async. We wait for a response from the
//           // serviceClient API before executing the next line of code.
//           const address = await deviceAddressServiceClient.getFullAddress(deviceId);  // This is an API call to the ASC

//           if (address.addressLine1 === null && address.stateOrRegion === null) {
//             console.log('The user does not have an address set.')
//           } else {
//             sessionAttributes.GetLocation.asc = {}
//             sessionAttributes.GetLocation.asc.address = address.addressLine1;
//             sessionAttributes.GetLocation.asc.stateOrRegion = address.stateOrRegion;
//             sessionAttributes.GetLocation.asc.postalCode = address.postalCode;
//             console.log('The address has been stored in session attributes.');
//           }
//         } catch (error) {
//           if (error.name !== 'ServiceError') {
//             console.log('Something went wrong.')
//           }
//           console.log('There was a service error getting the address ~~~~~\n', error)
//         }
//         attributesManager.setSessionAttributes(sessionAttributes);
//       }
//     }
//   }

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
  // helper.setQuestion(handlerInput, null)
  // helper.setQuestion(handlerInput, 'UseCurrentLocation')
// }


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