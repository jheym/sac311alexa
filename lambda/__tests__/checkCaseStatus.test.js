const Alexa = require('ask-sdk-core');
const helper = require('../helper/helperFunctions.js');
const GetPreviousCaseIntentHandler = require('../informationalIntents/checkCaseStatus.js').GetPreviousCaseIntentHandler;
helper.getCaseDetailsFromSalesForce = jest.fn();

const handlerInput = (intentName, questionAsked, caseNumber) => ({
  requestEnvelope: {
    request: {
      type: "IntentRequest",
      intent: {
        name: intentName,
      },
    },
  },
  attributesManager: {
    getSessionAttributes: () => ({
      questionAsked,
    }),
    getPersistentAttributes: async () => ({
      caseNumber,
    }),
    setSessionAttributes: jest.fn(),
  },
  responseBuilder: Alexa.ResponseFactory.init(),
  t: jest.fn((key) => key),
});


describe("Check Case Status Intent Handlers", () => {
  test("GetPreviousCaseIntentHandler canHandle", () => {
    const input = handlerInput("GetPreviousCaseIntent", null, null);
    expect(GetPreviousCaseIntentHandler.canHandle(input)).toEqual(true);
  });



  test("GetPreviousCaseIntentHandler › handle function returns the expected output with no case number", async () => {
    const input = handlerInput("GetPreviousCaseIntent", null, null);
    const output = await GetPreviousCaseIntentHandler.handle(input);
    expect(output).toEqual({
      outputSpeech: {
  
          ssml:  "<speak>Hmm, I'm sorry, I could not find a case for you. If you've submitted a case before, it's possible it was submitted with a different Amazon account or profile. Is there anything else I can help you with?</speak>",
          type: "SSML",
        
      },
      shouldEndSession: false,
  
  
    });
  

  });
  




test("GetPreviousCaseIntentHandler › handle function returns the expected output with case number but no case details", async () => {
  const input = handlerInput("GetPreviousCaseIntent", null, "12345");
  // Mock the helper.getCaseDetailsFromSalesForce function to return null

  const output = await GetPreviousCaseIntentHandler.handle(input);
  expect(output).toEqual({
    outputSpeech: {

        ssml: "<speak>Sure, I found a case for an abandoned vehicle that was submitted on <say-as interpret-as=\"date\" format=\"mdy\">12-31-2021</say-as>. The status of your case is new, in other words, it is still waiting to be reviewed. Is there anything else I can help you with?</speak>",
        type: "SSML",
      
    },
    shouldEndSession: false,


  });
 
});
// Mock the helper.getCaseDetailsFromSalesForce function to return case details
helper.getCaseDetailsFromSalesForce = jest.fn(() => ({
  createdDate: "2022-01-01T00:00:00.000Z",
  status: "NEW",
  subServiceType: "Vehicle On Street",
}));

test("GetPreviousCaseIntentHandler › handle function returns the expected output with case number and case details", async () => {
  const input = handlerInput("GetPreviousCaseIntent", null, "12345");
  const output = await GetPreviousCaseIntentHandler.handle(input);

  expect(output).toEqual({
    outputSpeech: {

        ssml: "<speak>Sure, I found a case for an abandoned vehicle that was submitted on <say-as interpret-as=\"date\" format=\"mdy\">12-31-2021</say-as>. The status of your case is new, in other words, it is still waiting to be reviewed. Is there anything else I can help you with?</speak>",
        type: "SSML",
      
    },
    shouldEndSession: false,


  });

 
  
});
test("GetPreviousCaseIntentHandler › handle function returns the expected output with case number and no case details due to helper.getCaseDetailsFromSalesForce returning null", async () => {
  const input = handlerInput("GetPreviousCaseIntent", null, "12345");
  
  // Set helper.getCaseDetailsFromSalesForce to return null
  helper.getCaseDetailsFromSalesForce = jest.fn(() => Promise.resolve(null));
  
  const output = await GetPreviousCaseIntentHandler.handle(input);

  expect(output).toEqual({
    outputSpeech: {

        ssml:  "<speak>Hmm, I'm sorry, I could not find a case for you. If you've submitted a case before, it's possible it was submitted with a different Amazon account or profile. Is there anything else I can help you with?</speak>",
        type: "SSML",
      
    },
    shouldEndSession: false,


  });
});

});