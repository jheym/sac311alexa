const Alexa = require("ask-sdk-core")
const helper = require("../helper/helperFunctions.js")
const sfCase = require("../helper/SalesforceCaseObject.js")
const { handler } = require("../index.js")
const StartedCloggedStormDrainIntentHandler = require("../serviceRequestIntents/cloggedStormDrain.js").StartedCloggedStormDrainIntentHandler 
const yn_StartedCloggedStormDrainIntentHandler = require("../serviceRequestIntents/cloggedStormDrain.js").yn_StartedCloggedStormDrainIntentHandler
const InProgressCloggedStormDrainIntentHandler = require("../serviceRequestIntents/cloggedStormDrain.js").InProgressCloggedStormDrainIntentHandler
const yn_CompletedCloggedStormDrainServiceRequest = require("../serviceRequestIntents/cloggedStormDrain.js").yn_CompletedCloggedStormDrainServiceRequest
const yn_SubmitCloggedDrainServiceRequestIntentHandler = require("../serviceRequestIntents/cloggedStormDrain.js").yn_SubmitCloggedDrainServiceRequestIntentHandler
// Mock the helper methods used by the handler
helper.setQuestion = jest.fn();
helper.getOAuthToken = jest.fn();
helper.createGenericCase = jest.fn();
helper.updateGenericCase = jest.fn();

// Mock the SalesforceCaseObject module, returning a mock implementation
jest.mock('../helper/SalesforceCaseObject', () => {
  return jest.fn().mockImplementation((token) => {
    return {
      token: token,
      sf_url: process.env.SALESFORCE_URL,
      json_input: {},
      mapped: {},
    };
  });
});

// Define a mock request envelope for the CloggedStormDrainIntent
const mockRequestEnvelope = {
  request: {
    type: "IntentRequest",
    intent: {
      name: "CloggedStormDrainIntent",
    },
  },
  context: {
    System: {
      device: {
        deviceId: "testDeviceId",
      },
    },
  },
};

// Define a mock handlerInput object, including responseBuilder, attributesManager, and translation function
const handlerInput = {
  requestEnvelope: mockRequestEnvelope,
  responseBuilder: Alexa.ResponseFactory.init(),
  attributesManager: {
    getSessionAttributes: jest.fn(),
    setSessionAttributes: jest.fn(),
  },
  t: jest.fn((key) => key),
};

describe("StartedCloggedStormDrainIntentHandler", () => {

  test("StartedCloggedStormDrainIntentHandler canHandle", () => {
    handlerInput.requestEnvelope.request.dialogState = "STARTED";
    expect(StartedCloggedStormDrainIntentHandler.canHandle(handlerInput)).toBe(true);
  });


  test("handle function returns the expected output", async () => {
    const handlerInput = {
      requestEnvelope: {
        request: {
          type: "IntentRequest",
          intent: {
            name: "CloggedStormDrainIntent",
          },
        },
        dialogState: "STARTED",
      },
      responseBuilder: Alexa.ResponseFactory.init(),
      attributesManager: {
        getSessionAttributes: () => ({}),
        setSessionAttributes: jest.fn(),
      },
      t: jest.fn((key) => key),
    };
  
    const response = await StartedCloggedStormDrainIntentHandler.handle(handlerInput);
  
    expect(response.outputSpeech.ssml).toContain("CLOGGED_CONFIRM");
    expect(response.shouldEndSession).toBe(false);
  });
  
});



 
describe("yn_StartedCloggedStormDrainIntentHandler", () => {
  const handlerInput = (intentName) => ({
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        intent: {
          name: intentName,
        },
      },
    },
    responseBuilder: Alexa.ResponseFactory.init(),
    attributesManager: {
      getSessionAttributes: () => ({
        questionAsked: "confirmCloggedDrain?",
      }),
      setSessionAttributes: jest.fn(),
    },
    t: jest.fn((key) => key),
  });
  test("canHandle returns true for AMAZON.YesIntent", () => {
    const input = handlerInput("AMAZON.YesIntent");
    expect(yn_StartedCloggedStormDrainIntentHandler.canHandle(input)).toBe(true);
  });
  test("canHandle returns true for AMAZON.NoIntent", () => {
    const input = handlerInput("AMAZON.NoIntent");
    expect(yn_StartedCloggedStormDrainIntentHandler.canHandle(input)).toBe(true);
  });
  test("handle function returns the expected output for AMAZON.YesIntent", async () => {
    const input = handlerInput("AMAZON.YesIntent");
    const response = await yn_StartedCloggedStormDrainIntentHandler.handle(input);

    expect(response.outputSpeech.ssml).toContain("CLOGGED_ADDRESS");
    expect(response.directives[0].slotToElicit).toBe("userGivenAddress");
   
  });

  test("handle function returns the expected output for AMAZON.NoIntent", async () => {
    const input = handlerInput("AMAZON.NoIntent");
    const response = await yn_StartedCloggedStormDrainIntentHandler.handle(input);

    expect(response.outputSpeech.ssml).toContain("ANYTHING_ELSE_MSG");
    expect(response.shouldEndSession).toBe(false);
  });
});
describe("InProgressCloggedStormDrainIntentHandler", () => {
  const handlerInput = (options) => ({
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        dialogState: "IN_PROGRESS",
        intent: {
          name: "CloggedStormDrainIntent",
          slots: {
            cloggedStormDrainInfo: {
              value: options.cloggedStormDrainInfoValue,
            },
          },
        },
      },
    },
    responseBuilder: Alexa.ResponseFactory.init(),
    attributesManager: {
      getSessionAttributes: () => ({
        confirmedPhoneNumber: options.confirmedPhoneNumber,
        CloggedStormDrainIntent: {
          slots: {
            cloggedStormDrainInfo: {
              value: options.cloggedStormDrainInfoValue,
            },
          },
        },
      }),
      setSessionAttributes: jest.fn(),
    },
    t: jest.fn((key) => key),
  });
  test("canHandle returns true when dialogState is IN_PROGRESS", () => {
    const input = handlerInput({ cloggedStormDrainInfoValue: "test info" });
    expect(InProgressCloggedStormDrainIntentHandler.canHandle(input)).toBe(true);
  });

  test("handle function returns the expected output when confirmedPhoneNumber is not set", async () => {
    const input = handlerInput({ confirmedPhoneNumber: null });
    const response = await InProgressCloggedStormDrainIntentHandler.handle(input);

    expect(response.directives[0].type).toBe("Dialog.Delegate");
    expect(response.directives[0].updatedIntent.name).toBe("GetPhoneNumberIntent");
  });

  test("handle function returns the expected output when cloggedStormDrainInfo slot has a value", async () => {
    const input = handlerInput({ confirmedPhoneNumber: "1234567890", cloggedStormDrainInfoValue: "test info" });
    const response = await InProgressCloggedStormDrainIntentHandler.handle(input);

    expect(response.outputSpeech.ssml).toContain("REPEAT_DESC");
    expect(response.shouldEndSession).toBe(false);
  });

  test("handle function returns the expected output when cloggedStormDrainInfo slot is empty", async () => {
    const input = handlerInput({ confirmedPhoneNumber: "1234567890", cloggedStormDrainInfoValue: null });
    const response = await InProgressCloggedStormDrainIntentHandler.handle(input);

    expect(response.outputSpeech.ssml).toContain("CLOGGED_INFO");
    expect(response.shouldEndSession).toBe(false);
  });
});

describe("yn_SubmitCloggedDrainServiceRequestIntentHandler", () => {

  const handlerInput = (intentName, questionAsked) => ({
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        intent: {
          name: intentName,
        },
      },
    },
    attributesManager: {
      getSessionAttributes: () => ({ questionAsked }),
      setSessionAttributes: jest.fn(),
    },
    responseBuilder: Alexa.ResponseFactory.init(),
    t: jest.fn((key) => key),
  });
  
  test("canHandle returns true for AMAZON.YesIntent", () => {
    const input = handlerInput("AMAZON.YesIntent", "CloggedDrainServiceRequestCorrect?");
    expect(yn_SubmitCloggedDrainServiceRequestIntentHandler.canHandle(input)).toBe(true);
  });
 
  test("canHandle returns true for AMAZON.NoIntent", () => {
    const input = handlerInput("AMAZON.NoIntent", "CloggedDrainServiceRequestCorrect?");
    expect(yn_SubmitCloggedDrainServiceRequestIntentHandler.canHandle(input)).toBe(true);
  });

  test("handle function returns the expected output for AMAZON.YesIntent", () => {
    const input = handlerInput("AMAZON.YesIntent", "CloggedDrainServiceRequestCorrect?");
    const response = yn_SubmitCloggedDrainServiceRequestIntentHandler.handle(input);

    expect(response.outputSpeech.ssml).toContain("GENERAL_DESC");
    expect(response.shouldEndSession).toBe(false);
    expect(response.directives[0].slotToElicit).toBe("cloggedStormDrainInfo");
  });

  test("handle function returns the expected output for AMAZON.NoIntent", () => {
    const input = handlerInput("AMAZON.NoIntent", "CloggedDrainServiceRequestCorrect?");
    const response = yn_SubmitCloggedDrainServiceRequestIntentHandler.handle(input);

    expect(response.outputSpeech.ssml).toContain("ANYTHING_ELSE_MSG");
    expect(response.shouldEndSession).toBe(false);
  });
});

describe("yn_CompletedCloggedStormDrainServiceRequest", () => {
  const handlerInput = (intentName, questionAsked, confirmedPhoneNumber) => ({
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
        confirmedPhoneNumber,
        confirmedValidatorRes: { Address: "123 Fake Street" },
        CloggedStormDrainIntent: {
          slots: {
            cloggedStormDrainInfo: { value: "Fake description" },
          },
        },
      }),
      setSessionAttributes: jest.fn(),
    },
    responseBuilder: Alexa.ResponseFactory.init(),
    t: jest.fn((key) => key),
  });
  

  helper.getOAuthToken = jest.fn(() => Promise.resolve("fake_token"));
  helper.createGenericCase = jest.fn(() => Promise.resolve({ case_id: "fake_case_id" }));
  helper.updateGenericCase = jest.fn(() => Promise.resolve({}));
  test("canHandle returns true for AMAZON.YesIntent", () => {
    const input = handlerInput("AMAZON.YesIntent", "submitCloggedTicket?");
    expect(yn_CompletedCloggedStormDrainServiceRequest.canHandle(input)).toBe(true);
  });
  test("canHandle returns true for AMAZON.NoIntent", () => {
    const input = handlerInput("AMAZON.NoIntent", "submitCloggedTicket?");
    expect(yn_CompletedCloggedStormDrainServiceRequest.canHandle(input)).toBe(true);
  });
  test("handle function returns the expected output", async () => {
    const input = handlerInput("AMAZON.YesIntent", "submitCloggedTicket?");
    const response = await yn_CompletedCloggedStormDrainServiceRequest.handle(input);

    expect(response.outputSpeech.ssml).toContain("GENERIC_CASE_THANKS");
    expect(response.shouldEndSession).toBe(false);
  });
  test("yn_CompletedCloggedStormDrainServiceRequest › handle function returns the expected output with a valid phone number", async () => {
    const input = handlerInput("AMAZON.YesIntent", "submitCloggedTicket?", "555-555-5555");
    const output = await yn_CompletedCloggedStormDrainServiceRequest.handle(input);
  
    
  });
  test("yn_CompletedCloggedStormDrainServiceRequest › handle function returns the expected output with no phone number", async () => {
    const input = handlerInput("AMAZON.YesIntent", "submitCloggedTicket?", "FAILED");
    const output = await yn_CompletedCloggedStormDrainServiceRequest.handle(input);
  


  
  });
  
});


