const Alexa = require("ask-sdk-core")
const helper = require("./helper/helperFunctions.js")

const GetGenericDescriptionFromUserIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
			Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetGenericDescriptionFromUserIntent'
		);
	},
	async handle(handlerInput) {
        const { requestEnvelope, responseBuilder, attributesManager } = handlerInput
		const sessionAttributes = attributesManager.getSessionAttributes();
		let genericDescription = Alexa.getSlotValue(requestEnvelope, 'GenericDescription');
        let intentSlot = sessionAttributes.intentToRestore;

        //add new if statements for new intents with generic Descriptions
        if (intentSlot === "CloggedStormDrainIntent") {
            sessionAttributes.CloggedStormDrainIntent.GenericDescription = genericDescription;
        }
        else if (intentSlot === "AlexIntent") {
            //sessionAttributes.AlexIntent.GenericDescription = genericDescription;
        }
		attributesManager.setSessionAttributes(sessionAttributes);

        let updatedIntent = helper.switchIntent(handlerInput, sessionAttributes.intentToRestore)
        return responseBuilder
            .addDelegateDirective(updatedIntent)
            .getResponse();
    }
}

module.exports = {GetGenericDescriptionFromUserIntentHandler}