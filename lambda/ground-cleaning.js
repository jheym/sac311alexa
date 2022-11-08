const Alexa = require("ask-sdk-core")

const GroundCleaningIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" && 
            Alexa.getIntentName(handlerInput.requestEnvelope) === "GroundCleaningIntent"
        )
    },

    handle(handlerInput) {
        const alexaResponse = "Thank you for your notification, we will send someone out there soon."
        
        return handlerInput.responseBuilder
        .speak(alexaResponse)
        .reprompt("Ask for address of park/ prompt user to provide information on what needs to be cleaned etc...")
        .getResponse()
    },
}
module.exports = {GroundCleaningIntentHandler}