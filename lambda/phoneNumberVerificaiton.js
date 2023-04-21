const Alexa = require('ask-sdk-core');
const helper = require('./helper/helperFunctions.js');
const sfCase = require('./helper/SalesforceCaseObject.js');
const axios = require('axios');
const iso8601 = require('iso8601-duration');


function PhoneNumberFormat(phoneNum) {
    let phone = phoneNum.replace(/\s/g, '');
    if (phone.length > 9 && /^\d+$/.test(phone)) {
      phone = phone.substring(phone.length - 10);
      return phone;
    }else{
      return null;
    }
    
  
    
  }
  async function getPhoneNumber(handlerInput) {
    const { permissions } = handlerInput.requestEnvelope.context.System.user;
    if (!permissions || !permissions.consentToken) {
      return null;
    }
  
   
    const serviceClientFactory = handlerInput.serviceClientFactory;
    const upsServiceClient = serviceClientFactory.getUpsServiceClient();
    try {
      //add phone into session attributes
      const profile = await upsServiceClient.getProfileMobileNumber();
      handlerInput.attributesManager.setSessionAttributes({ phone: profile.phoneNumber });
      return PhoneNumberFormat(profile.phoneNumber);
    } catch (error) {
      if (error.name !== 'ServiceError') {
        const message = `There was a problem calling the Device Address API. ${error.message}`;
        console.log(message);
        throw error;
      }
      if (error.statusCode === 403) {
        console.log('The user has not granted permissions to access their phone.');
     
      } else {
        const message = `There was a problem calling the Device Address API. ${error.message}`;
        console.log(message);
        throw error;
      }
    }
    return null;
  }

  //Create a GetPhoneNumberIntentHandler that will call the getPhoneNumber function and return the phone number to the user if they have given permission to access their phone
   //number. Ask them to verify it if no then ask them for a phone number. if they don't have permission to access their phone number ask them for one and save it in the session attribute called phone.
   //Utillize the getPhoneNumber function to retrieve the phone number and save it in the session attribute called phone.
   const GetPhoneNumberIntentHandler = {
    canHandle(handlerInput) {
        return (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetPhoneNumberIntent');
    },
    async handle(handlerInput) {
        let phone = await getPhoneNumber(handlerInput);
        if (phone == null) {
          const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
          sessionAttributes.questionAsked = 'GetUserPhoneNumber?'; 
          handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
          return GetUserPhoneNumberIntentHandler.handle(handlerInput);
          
        }
        else {
            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            sessionAttributes.questionAsked = 'IsPhoneNumCorrect?'; 
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
            return Yn_GetPhoneNumberIntentHandler.handle(handlerInput);
        }
    }
};

  //Get the phone number from the user and save it in the session attribute called phone. If the user has given permission to access their phone number then call the getPhoneNumber function to retrieve it.
  const GetUserPhoneNumberIntentHandler = {
    canHandle(handlerInput) {
        return (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetLocationFromUserIntent' &&
        Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED' &&
        handlerInput.attributesManager.getSessionAttributes().questionAsked === 'GetUserPhoneNumber?'

    );
  },
  async handle(handlerInput) {
    const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    let getPhoneNumber = Alexa.getSlotValue(requestEnvelope, 'GetPhoneNumber');
   
    attributesManager.setSessionAttributes(sessionAttributes);
    getPhoneNumber = PhoneNumberFormat(getPhoneNumber);
    if (getPhoneNumber) {
    
      let speechOutput = handlerInput.t("PHONE_CONFIRM", { phone: getPhoneNumber });
      helper.setQuestion(handlerInput, 'IsUserPhoneNumCorrect?' );
      sessionAttributes.phone = getPhoneNumber;
      attributesManager.setSessionAttributes(sessionAttributes);
      return responseBuilder
      .speak(speechOutput)
      .withShouldEndSession(false)
      .reprompt(speechOutput)
      .getResponse();
    }   
    if (Alexa.getIntentName(requestEnvelope) === 'AMAZON.NoIntent') {
      if(helper.getFailCounter(handlerInput) >=2){
       helper.clearFailCounter(handlerInput);
       
       helper.setQuestion(handlerInput, 'anythingElse?');
       return responseBuilder
         .speak(handlerInput.t('CONTINUE_PHONE_MSG'))
         .withShouldEndSession(false)
         .getResponse();
     }
     helper.incFailCounter(handlerInput);
     const GetPhoneNumberIntent = {
       name: 'GetPhoneNumberIntent',
       confirmationStatus: 'NONE',
       slots: {
           GetPhoneNumber: {
               name: 'GetPhoneNumber',
               value: null,
               confirmationStatus: 'NONE',
           }
   }
 }
 return responseBuilder
   .speak(handlerInput.t('PHONE_RETRY'))
   .addElicitSlotDirective('GetPhoneNumber', GetPhoneNumberIntent)
   .getResponse();
 }
}
  
};


    //Create a yes and no intent handler for the GetPhoneNumberIntentHandler. If the user says yes then save the phone number in the session attribute called phone. If the user says no (only say no 3x) then ask them for their phone number.
    const Yn_GetPhoneNumberIntentHandler = {
      canHandle(handlerInput) {
          return (
              Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
              (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' ||
                  Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent') &&
              handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsPhoneNumCorrect?'
          );
      },
      async handle(handlerInput) {
          const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
          const sessionAttributes = attributesManager.getSessionAttributes();
          helper.setQuestion(handlerInput, null);
          const GetPhoneNumberIntent = {
            name: 'GetPhoneNumberIntent',
            confirmationStatus: 'NONE',
            slots: {
              GetPhoneNumber: {
                name: 'GetPhoneNumber',
                value: null,
                confirmationStatus: 'NONE',
              }
            }
      }
    
  
          if (Alexa.getIntentName(requestEnvelope) === 'AMAZON.YesIntent') {
              helper.setQuestion(handlerInput, null);
              if (!sessionAttributes.phone) {
                  throw new Error('No phone number in session');
              }
   
              if (sessionAttributes.phone) {
                  let speechOutput = handlerInput.t("PHONE_CONFIRM", { phone: sessionAttributes.phone });
                  helper.setQuestion(handlerInput, 'IsUserPhoneNumCorrect?');
                  return responseBuilder
                      .speak(speechOutput)
                      .withShouldEndSession(false)
                      .getResponse();
              } else {
                  let speechOutput = `I'm sorry, I was unable to retrieve your phone number. Please provide a new phone number.`;
                  return responseBuilder
                      .speak(speechOutput)
                      .addElicitSlotDirective('GetPhoneNumber', GetPhoneNumberIntent)
                      .getResponse();
              }
          }
  
          if (Alexa.getIntentName(requestEnvelope) === 'AMAZON.NoIntent' ) {
              let speechOutput = "Okay, please provide a new phone number.";
              attributesManager.setSessionAttributes(sessionAttributes);
              console.log(GetPhoneNumberIntent)
              return responseBuilder
                  .speak(speechOutput)
                  .withShouldEndSession(false)
                  .addElicitSlotDirective('GetPhoneNumber', GetPhoneNumberIntent)
                  .getResponse();
          }
      }
  };
  
  
      const Yn_IsPhoneNumberCorrectIntentHandler = {
        canHandle(handlerInput) {
            return (
                Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
                (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' ||
                    Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent') &&
                handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsUserPhoneNumCorrect?'
            );
        },
        async handle(handlerInput) {
        
            const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
            const sessionAttributes = attributesManager.getSessionAttributes();
            helper.setQuestion(handlerInput, null);
            attributesManager.setSessionAttributes(sessionAttributes);
            if (Alexa.getIntentName(requestEnvelope) === 'AMAZON.YesIntent') {
                if (sessionAttributes.phone == null) {
                  throw new Error('yn_IsPhoneNumberCorrectIntentHandler: phone number is null');
                }
               
                //  let speechOutput = handlerInput.t('PHONE_CONFIRM', { phone: sessionAttributes.phone });
                 attributesManager.setSessionAttributes(sessionAttributes);
                  //let updatedIntent = helper.switchIntent(handlerInput, 'GetLocationFromUserIntent');

                  return responseBuilder
                    .speak('Okay, I will use this number, now how may I help you?')
                    .withShouldEndSession(false)
			              .getResponse()
               
              }
          if (Alexa.getIntentName(requestEnvelope) === 'AMAZON.NoIntent') {
           if(helper.getFailCounter(handlerInput) >=2){
            helper.clearFailCounter(handlerInput);
            
            helper.setQuestion(handlerInput, 'anythingElse?');
            return responseBuilder
              .speak(handlerInput.t('CONTINUE_PHONE_MSG'))
              .withShouldEndSession(false)
              .getResponse();
          }
          helper.incFailCounter(handlerInput);
          const GetPhoneNumberIntent = {
            name: 'GetPhoneNumberIntent',
            confirmationStatus: 'NONE',
            slots: {
                GetPhoneNumber: {
                    name: 'GetPhoneNumber',
                    value: null,
                    confirmationStatus: 'NONE',
                }
        }
      }
      return responseBuilder
        .speak(handlerInput.t('PHONE_RETRY'))
        .addElicitSlotDirective('GetPhoneNumber', GetPhoneNumberIntent)
        .getResponse();
      }
    }
  };


      const Yn_TryAnotherPhoneNumber = {
        canHandle(handlerInput) {
            return (
                Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
                (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' ||
                    Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent') &&
                handlerInput.attributesManager.getSessionAttributes().questionAsked === 'TryAnotherPhoneNumber?'
            );
        },
      handle(handlerInput){
        const { requestEnvelope, responseBuilder} = handlerInput;
        const  intentName  = requestEnvelope.request.intent.name;
        helper.setQuestion(handlerInput, null);
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        if(intentName === 'AMAZON.YesIntent'){
          const GetPhoneNumberIntent = {
            name: 'GetPhoneNumberIntent',
            confirmationStatus: 'NONE',
            slots: {
              GetPhoneNumber: {
                name: 'GetPhoneNumber',
                value: undefined,
                confirmationStatus: 'NONE',
              }
            }
      }
    
        
      return responseBuilder
        .speak(handlerInput.t('PHONE_RETRY'))
        .reprompt(handlerInput.t('PHONE_GET_NUMBER'))
        .addElicitSlotDirective('PhoneNumber', GetPhoneNumberIntent)
        .getResponse();
        }
        if(intentName === 'AMAZON.NoIntent'){
          helper.setQuestion(handlerInput, 'anythingElse?');
          return responseBuilder
            .speak(handlerInput.t('ANYTHING_ELSE_MSG'))
            .withShouldEndSession(false)
            .getResponse();
        }
      }
    };
  



    module.exports = { getPhoneNumber,GetPhoneNumberIntentHandler, GetUserPhoneNumberIntentHandler,Yn_IsPhoneNumberCorrectIntentHandler,
      Yn_GetPhoneNumberIntentHandler, 
      Yn_TryAnotherPhoneNumber };

