
const Alexa = require("ask-sdk-core")
const helper = require("./helper/helperFunctions.js")
const sfCase = require("./helper/Salesforce_Case_object.js")


const AbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
      && Alexa.getIntentName(handlerInput.requestEnvelope) === "AbandonedVehicleIntent"
    )
  },

  async handle(handlerInput) {
    const { attributesManager, requestEnvelope, responseBuilder } = handlerInput
    const currentIntent = requestEnvelope.request.intent;
    const sessionAttributes = attributesManager.getSessionAttributes()
    
    if (Alexa.getDialogState(requestEnvelope) === "STARTED") {
      helper.setQuestion(handlerInput, null);
      helper.setQuestion(handlerInput, 'IsAbandonedVehicleCorrect?')
      const speakOutput = handlerInput.t("ABANDONED_VEHICLE_CONFIRMATION")

      // Check if the device supports APL
      if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
        console.log("The user's device supports APL");
        
        responseBuilder.addDirective({ // Don't need handlerInput.responseBuilder because resonseBuilder is already defined above
        "type": "Alexa.Presentation.APL.RenderDocument",
        "token": "documentToken", // Change this to something unique and informative
        "document": {
            "src": "doc://alexa/apl/documents/QuickResponse",
            "type": "Link"
        },
        "datasources": {
            "multipleChoiceTemplateData": {
                "type": "object",
                "properties": {
                    "backgroundImage": "https://f6032016-9dec-44c4-96c1-31a7ae92d22c-us-west-2.s3.us-west-2.amazonaws.com/Media/311.png",
                    "titleText": "311",
                    "primaryText": speakOutput, // use speakOutput variable here
                    "choices": [
                        "Yes ",
                        "No"
                    ],
                    "choiceListType": "none",
                    "headerAttributionImage": "311",
                    "footerHintText": ""
                }
            }
          }
        });
      } else {
        // The device does not support APL
        console.log("The user's device does not support APL");
      }
      
      return responseBuilder 
      .withShouldEndSession(false)
      .speak(speakOutput)
      .getResponse();
    }

    if (Alexa.getDialogState(handlerInput.requestEnvelope) === "IN_PROGRESS") {
      if (currentIntent.confirmationStatus === 'DENIED') {
        console.log("Abandoned vehicle intent confirmation was DENIED")
        let updatedIntent = currentIntent;
        for (key in updatedIntent.slots) {
          delete updatedIntent.slots[key].value;
        }

        updatedIntent.confirmationStatus = 'NONE';

        return responseBuilder
          .addDelegateDirective(updatedIntent)
          .withShouldEndSession(false)
          .getResponse();
      } else {
        return responseBuilder
          .addDelegateDirective(currentIntent)
          .getResponse();
      }
    }



    if (Alexa.getDialogState(handlerInput.requestEnvelope) === "COMPLETED") {

      // If the user denies the slots, we need to clear the slots and start over
      if (currentIntent.confirmationStatus === 'DENIED') {
        console.log("Abandoned vehicle intent confirmation was DENIED")
        let updatedIntent = currentIntent;
        for (key in updatedIntent.slots) {
          delete updatedIntent.slots[key].value;
        }

        updatedIntent.confirmationStatus = 'NONE';

        return responseBuilder
          .addDelegateDirective(updatedIntent)
          .withShouldEndSession(false)
          .getResponse();
      }

        // SUBMITTING A CASE
        // TODO: Is phone number required for basic case?
        var location = sessionAttributes.confirmedLocation;
        let phone_number = '9165551111' // TODO: Get phone number from Alexa api
        let service_name = 'Vehicle On Street' // Need to use the correct service name
        let token = await helper.getOAuthToken();
        let my_case_obj = new sfCase(handlerInput, 'Vehicle On Street', token); // Creating a new case object with a new token
        
        let { case_number, case_id } = await my_case_obj.create_basic_case(service_name, phone_number, location);
        
				let basic_case_query = `SELECT CreatedDate, Id, CaseNumber, Service_Type__c, Sub_Service_Type__c, Subject, Status, Origin, ContactId, Description, Email_Web_Notes__c
                                FROM Case
                                WHERE CaseNumber = '${case_number}'`;
				let basic_case_res = await helper.querySFDB(basic_case_query, token);
				
				if (basic_case_res.data.records[0])
					console.log(basic_case_res.data.records[0])
        
        sessionAttributes.phone_number = phone_number;
        attributesManager.setSessionAttributes(sessionAttributes);

        my_case_obj = new sfCase(handlerInput, 'Vehicle On Street', token); // TODO: Try case_update on the same object (dont create a new one!)
        let json_input = my_case_obj.json_input;
        json_input['vehicle_license_number'] = '5RTD901';
        json_input['time-period'] = '3';
        const update_res = await my_case_obj.case_update(case_id, location, 'Vehicle On Street', json_input);

				let updated_case_query = `SELECT CreatedDate, Id, CaseNumber, Service_Type__c, Sub_Service_Type__c, Subject, Status, Origin, Anonymous_Contact__c, ContactId, Description, Email_Web_Notes__c,
																	Address_Geolocation__Latitude__s, Address_Geolocation__Longitude__s, Address_X__c, Address_Y__c, Address__c, GIS_City__c, Street_Center_Line__c, Case_Gis_Info_JSON__c
																	FROM Case
																	WHERE CaseNumber = '${case_number}'`;
				
				const updated_case_res = await helper.querySFDB(updated_case_query, token);

				if (updated_case_res.data.records[0])
					console.log(updated_case_res.data.records[0]);

				

        console.log(update_res);
        // DONE SUBMITTING CASE
        
        
        var make = Alexa.getSlotValue(handlerInput.requestEnvelope, 'make');
        var model = Alexa.getSlotValue(handlerInput.requestEnvelope, 'model');
        var color = Alexa.getSlotValue(handlerInput.requestEnvelope, 'color');
        speakOutput = handlerInput.t('ABANDONED_VEHICLE_THANKS', { color: `${color}`, make: `${make}`, model: `${model}`, location: `${location}`, case_number : `${case_number}` })


      
        // IMPORTANT: Clear slots after creating a new case so they don't get reused if the caller wants to submit a different ticket
        helper.clearSlots(handlerInput, requestEnvelope.request.intent) 
        //TODO: Set question for "anything else?" 
        return responseBuilder
          .speak(speakOutput)
          .withShouldEndSession(false) // TODO: go back to welcome message optionally if there's anything else?
          .getResponse();
      
    }
  },
}

const YesAbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedVehicleCorrect?'
    );
  },
  handle(handlerInput) {
    helper.setQuestion(handlerInput, null);
    helper.setQuestion(handlerInput, 'IsAbandonedTime?');
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.reasonForCalling = 'AbandonedVehicleIntent'; // So GetLocationIntent knows where to delegate back to after confirming the address
    return (
      handlerInput.responseBuilder
        .speak(handlerInput.t('ABANDONED_VEHICLE_72Q'))
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
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedTime?'
    )
  },
  handle(handlerInput) {
    helper.setQuestion(handlerInput, null) // Remember to clear the questionAsked field for other y/n questions in same session
    const { responseBuilder, attributesManager } = handlerInput
    const sessionAttributes = attributesManager.getSessionAttributes()

    return responseBuilder
      .addDelegateDirective({
        name: 'GetLocationIntent',
        confirmationStatus: 'NONE',
        slots: {}
      })
      .getResponse()
  }
}

const NoAbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedVehicleCorrect?'
    )
  },
  handle(handlerInput) {
    helper.setQuestion(handlerInput, null)
    helper.setQuestion(handlerInput, 'TryAgain')
    return (
      handlerInput.responseBuilder
        .speak(handlerInput.t('UNKNOWN_MSG'))
        .reprompt(handlerInput.t('UNKNOWN_MSG_REPROMPT'))
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
      && handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedTime?'
    )
  },
  handle(handlerInput) {
    helper.setQuestion(handlerInput, null)
    helper.setQuestion(handlerInput, 'TryAgain')
    return (
      handlerInput.responseBuilder
        .speak(handlerInput.t('ABANDONED_VEHICLE_72A'))
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
