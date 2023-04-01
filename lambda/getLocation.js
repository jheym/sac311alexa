const Alexa = require('ask-sdk-core')
const helper = require("./helper/helperFunctions.js")
const format = require('./helper/formatAddress.js')
const sfCase = require('./helper/Salesforce_Case_object.js')
const { NoAbandonedVehicleIntentHandler } = require('./abandoned-vehicle.js')
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
				helper.setQuestion(handlerInput, null)
				helper.setQuestion(handlerInput, 'UseCurrentLocation?')
				return responseBuilder
				.speak(handlerInput.t("LOCATION_USE_CURRENT"))
				.withShouldEndSession(false)
				.getResponse();
			}

			// I'm disabling home address stuff for now. It's confusing for the user imo and would be
			// hard to implement on a case by case basis. - Justin

			// else if (sessionAttributes.GetLocation && (homeAddress = sessionAttributes.GetLocation.asc)) {
			// // If we found an address and the user has not been prompted yet
			//   helper.setQuestion(handlerInput, null)
			//   helper.setQuestion(handlerInput, 'UseHomeAddress?')
			//   return responseBuilder
			//     .speak(handlerInput.t("LOCATION_USE_HOME"))
			//     .withShouldEndSession(false)
			//     .getResponse();
			// } 

			else {
				// If no address or geolocation were available from from the user, delegate to the GetLocationHelperIntent
				return responseBuilder
					.speak(handlerInput.t("LOCATION_GET_LOCATION"))
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
		}

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
							value: location,
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
}


/**
 * If the user says yes to using their current location, delegate their location
 * back to getLocation intent
 */
const yn_UseCurrentLocationIntentHandler = {
	canHandle(handlerInput) {
		const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
		const intentName = Alexa.getIntentName(handlerInput.requestEnvelope)
		const questionAsked = handlerInput.attributesManager.getSessionAttributes().questionAsked;
		return (requestType === "IntentRequest" && 
			(intentName === "AMAZON.YesIntent" || intentName === "AMAZON.NoIntent") &&
			questionAsked === "TryAgain");
	},
	async handle(handlerInput) {
		const { responseBuilder, attributesManager } = handlerInput
		const sessionAttributes = attributesManager.getSessionAttributes()
		helper.setQuestion(handlerInput, null)
		
		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			const geolocation = sessionAttributes.GetLocation && sessionAttributes.GetLocation.Geolocation
			const latitude = geolocation.coordinate.latitudeInDegrees;
			const longitude = geolocation.coordinate.longitudeInDegrees;
			let worldAddress = await helper.reverseGeocode(latitude, longitude);
			
			if (worldAddress) { // TODO: Test with bad geocoordinates
				const delegateBody = {
					name: 'GetLocationIntent',
					confirmationStatus: 'NONE',
					slots: {
						location: {
							name: 'location',
							value: worldAddress,
							confirmationStatus: 'NONE' // No need to have user confirm their geolocation coordinates
				}}}
				return responseBuilder
				.addDelegateDirective(delegateBody)
				.getResponse()
			} else {
				return responseBuilder
				.speak(handlerInput.t("LOCATION_GEO_ISSUE"))
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
				.getResponse()
			}
		} else { // AMAZON.NoIntent
			return responseBuilder
				.speak(handlerInput.t("LOCATION_GET_LOCATION"))
				.addDelegateDirective({
					name: 'GetLocationHelperIntent',
					confirmationStatus: 'NONE',
					slots: {
						helperLocation: {
							name: 'helperLocation',
							confirmationStatus: 'NONE'
				}}})
				.getResponse()
		}
	}
}

/**
 * If the user says yes to using their home address, delegate their address back to getLocation intent
 */
// const YesUseHomeAddressIntentHandler = {
//   canHandle(handlerInput) {
//     return (
//       Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
//       && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
//       && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'UseHomeAddress?'
//     )
//   },
//   handle(handlerInput) {
//     const { responseBuilder, attributesManager, requestEnvelope } = handlerInput
//     const sessionAttributes = attributesManager.getSessionAttributes()
//     helper.setQuestion(handlerInput, null)
//     console.log(sessionAttributes.questionAsked) 

//     var address = sessionAttributes.GetLocation && sessionAttributes.GetLocation.asc &&
//       sessionAttributes.GetLocation.asc.address;
//     var postalCode = sessionAttributes.GetLocation && sessionAttributes.GetLocation.asc &&
//       sessionAttributes.GetLocation.asc.postalCode;
//     console.log(address + ' ' + postalCode)
//     let location = address + ' ' + postalCode


//     // TODO: What happens if locationObj is null?

//     if (requestEnvelope.request.intent.confirmationStatus === 'NONE') {
//       return responseBuilder
//         .speak('Do you want to use ' + location + '?')
//         .withShouldEndSession(false)
//         .getResponse();
//     }

//     return responseBuilder
//       .addDelegateDirective({
//         name: 'GetLocationIntent',
//         confirmationStatus: 'NONE',
//         slots: {
//           location: {
//             name: 'location',
//             value: location,
//             confirmationStatus: 'CONFIRMED'
//           }
//         }
//       })
//       .getResponse();
//   }
// }


// const NoUseHomeAddressIntentHandler = {
//   canHandle(handlerInput) {
//     return (
//       Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
//       && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
//       && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'UseHomeAddress?'
//     )
//   },
//   handle(handlerInput) {
//     return handlerInput.responseBuilder
//       .addDelegateDirective({
//         name: 'GetLocationHelperIntent',
//         confirmationStatus: 'NONE',
//         slots: {
//           helperLocation: {
//             name: 'helperLocation',
//             value: null,
//             confirmationStatus: 'NONE'
//           }
//         }
//       })
//       .speak(handlerInput.t("LOCATION_GET_LOCATION"))
//       .withShouldEndSession(false)
//       .reprompt(handlerInput.t("GENERIC_REPROMPT"))
//       .getResponse();
//   }
// }

const yn_TryAnotherAddress = {
	canHandle(handlerInput) {
		const requestType = handlerInput.requestEnvelope.request.type;
		const intentName = handlerInput.requestEnvelope.request.intent.name;
		const questionAsked = handlerInput.attributesManager.getSessionAttributes().questionAsked;
		return (
			requestType === 'IntentRequest' && (intentName === 'AMAZON.NoIntent' || intentName === 'AMAZON.YesIntent') &&
			questionAsked === 'tryAnotherAddress?'
		)
	},
	handle(handlerInput) {
		const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
		const intentName = requestEnvelope.request.intent.name;
		helper.setQuestion(handlerInput, null);

		if (intentName === 'AMAZON.YesIntent') {
			const speechOutput = handlerInput.t('LOCATION_GET_LOCATION')
			const delegateBody = {
				name: 'GetLocationHelperIntent',
				confirmationStatus: 'NONE',
				slots: {
					helperLocation: {
						name: 'helperLocation',
						value: null,
						confirmationStatus: 'NONE'
			}}}
			return responseBuilder
				.speak(speechOutput)
				.addDelegateDirective(delegateBody)
				.getResponse();
		}
		
		if (intentName === 'AMAZON.NoIntent') {
			helper.setQuestion(handlerInput, 'anythingElse?')
			return responseBuilder
				.speak(`I'm sorry about that. Is there anything else I can help you with?`)
				.withShouldEndSession(false)
				.getResponse();
		}
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
	async handle(handlerInput) {
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput
		const sessionAttributes = attributesManager.getSessionAttributes();
		sessionAttributes.addressFlow = sessionAttributes.addressFlow ? sessionAttributes.addressFlow : sessionAttributes.addressFlow = {};


		// If the user has not yet confirmed their location, ask them to confirm it
		if (Alexa.getSlot(handlerInput.requestEnvelope, 'helperLocation') &&
			Alexa.getSlot(handlerInput.requestEnvelope, 'helperLocation').confirmationStatus === 'NONE') {
			console.log('confirmationStatus is NONE')
			const address = format.formatInput(Alexa.getSlotValue(requestEnvelope, 'helperLocation'));

			// Verify location
			let token = await helper.getOAuthToken();
			let caseObj = await new sfCase(null, null, token);
			let res = await caseObj.address_case_validator(address);
			sessionAttributes.addressFlow.validatedObj = res; // Save the result in session attributes
			attributesManager.setSessionAttributes(sessionAttributes);

			//get a candidate from world gis to compare against local gis. returns false if no suitable address
			if (res.Validated) {
				return responseBuilder
					.addConfirmSlotDirective('helperLocation')
					.speak(handlerInput.t("LOCATION_REPEAT_ADDRESS", { address: res.Address }))
					.reprompt(handlerInput.t("LOCATION_REPEAT_ADDRESS", { address: res.Address }))
					.getResponse();
			} else {
				helper.setQuestion(handlerInput, 'tryAnotherAddress?')
				await attributesManager.setSessionAttributes(sessionAttributes);
				return responseBuilder
					.speak(`I was unable to find an address near ${res.Address}. Do you want to try giving another address?`)
					.reprompt(handlerInput.t("LOCATION_REPEAT_ADDRESS", { address: res.Address }))
					.getResponse();
			}
		}
		// else {
		//   const sessionAttributes = attributesManager.getSessionAttributes();

		//   // If the user has failed to provide a valid address 3 times, switch to live agent
		//   if (sessionAttributes.AddressFailCounter > 2) {
		//     console.log('Address collection has failed too many times. Switching to live agent.');
		//     sessionAttributes.AddressFailCounter = 0;
		//     attributesManager.setSessionAttributes(sessionAttributes);
		//     helper.setQuestion('LiveAgent?');
		//     return responseBuilder
		//       .speak(handlerInput.t("LOCATION_RETRY_REDIRECT"))
		//       .getResponse();
		//   }

		//   // If the user has failed to provide a valid address less than 3 times, ask them to try again
		//   sessionAttributes.AddressFailCounter = sessionAttributes.AddressFailCounter ? sessionAttributes.AddressFailCounter + 1 : 1;
		//   console.log('AddressFailCounter: ' + sessionAttributes.AddressFailCounter)
		//   attributesManager.setSessionAttributes(sessionAttributes);
		//   return responseBuilder
		//   .addDelegateDirective({
		//     name: 'GetLocationHelperIntent',
		//     confirmationStatus: 'NONE',
		//     slots: {
		//       helperLocation: {
		//         name: 'helperLocation',
		//         value: null,
		//         confirmationStatus: 'NONE'
		//       }
		//       }
		//     })
		//   }
		// }

		// If the user has denied the location, ask them to try again
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
				.speak(handlerInput.t("LOCATION_RETRY"))
				.reprompt(handlerInput.t("LOCATION_RETRY_REPROMPT"))
				.getResponse();
		}

		// If the user has confirmed the location, delegate to the main intent
		if (Alexa.getSlot(handlerInput.requestEnvelope, 'helperLocation') &&
			Alexa.getSlot(handlerInput.requestEnvelope, 'helperLocation').confirmationStatus === 'CONFIRMED') {

			console.log('confirmationStatus is CONFIRMED');

			let address = Alexa.getSlotValue(requestEnvelope, 'helperLocation');
			let location = format.formatInput(address);

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
			// try {
			//   const { deviceId } = requestEnvelope.context.System.device;
			//   const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
			//   // This is why the function is async. We wait for a response from the
			//   // serviceClient API before executing the next line of code. 
			//   const address = await deviceAddressServiceClient.getFullAddress(deviceId);  // This is an API call to the ASC

			//   if (address.addressLine1 === null && address.stateOrRegion === null) {
			//     console.log('The user does not have an address set.')
			//   } else {
			//     sessionAttributes.GetLocation.asc = {}
			//     sessionAttributes.GetLocation.asc.address = address.addressLine1;
			//     sessionAttributes.GetLocation.asc.stateOrRegion = address.stateOrRegion;
			//     sessionAttributes.GetLocation.asc.postalCode = address.postalCode;
			//     console.log('The address has been stored in session attributes.');
			//     console.log(address);
			//   }
			// } catch (error) {
			//   if (error.name !== 'ServiceError') {
			//     console.log('Something went wrong.')
			//   }
			//   // It's okay if this reports a 403. That just means the user has not
			//   // enabled permissions. In that case, GetLocationIntentHandler will
			//   // handle it.
			//   console.log('There was a service error getting the address ~~~~~\n', error)
			// }

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
	// YesUseHomeAddressIntentHandler,
	// NoUseHomeAddressIntentHandler,
	GetLocationHelperIntentHandler,
	// DelegateToGetLocationResponseInterceptor,
	GetLocationRequestInterceptor,
	yn_TryAnotherAddress,
	yn_UseCurrentLocationIntentHandler
}