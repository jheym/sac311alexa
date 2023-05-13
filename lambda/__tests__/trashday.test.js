const Alexa = require('ask-sdk-core');
const helper = require('../helper/helperFunctions.js');
const sfCase = require('../helper/SalesforceCaseObject.js');
const StartedTrashPickupDayIntentHandler = require('../informationalIntents/trashPickupDay.js').StartedTrashPickupDayIntentHandler;
const InProgressTrashPickupDayIntentHandler = require('../informationalIntents/trashPickupDay.js').InProgressTrashPickupDayIntentHandler;
const yn_UseHomeAddressForGarbageDayIntentHandler = require('../informationalIntents/trashPickupDay.js').yn_UseHomeAddressForGarbageDayIntentHandler ;
const axios = require('axios');



helper.isHomeAddressAvailable = jest.fn();
helper.getHomeAddress = jest.fn();
helper.getOAuthToken = jest.fn();
helper.setQuestion = jest.fn();


const fetchData = async (user_fld) => {
  const url = `${process.env.INTERNAL_GIS_ENDPOINT}/arcgis/rest/services/GenericOverlay/FeatureServer/37/query?where=ADDRESSID = ${user_fld}&outFields=*&f=pjson`;
  
  try {
    const res = await axios.get(encodeURI(url), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        "Accept": "application/json",
      }
    });

    return res;

  } catch (error) {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      throw new Error(error.response.data);
    } else {
      console.log(error);
      throw new Error(error);
    }
  }
};

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

jest.mock('axios');

const handlerInput = {
  requestEnvelope: {
    context: {
      System: {
        device: {
          deviceId: 'test_device_id',
        },
        apiEndpoint: 'https://api.amazonalexa.com',
        apiAccessToken: 'test_api_access_token',
      },
    },
    request: {
      type: 'IntentRequest',
      intent: {
        name: 'TrashPickupDayIntent',
        confirmationStatus: 'NONE',
      },
      dialogState: 'STARTED',
    },
   
  },
  attributesManager: {
    getSessionAttributes: () => ({}),
    setSessionAttributes: jest.fn(),
  },
  responseBuilder: Alexa.ResponseFactory.init(),
};

describe('StartedTrashPickupDayIntentHandler', () => {

 beforeEach(() => {
    helper.isHomeAddressAvailable.mockReset();
    helper.getHomeAddress.mockReset();
    helper.getOAuthToken.mockReset();
    helper.setQuestion.mockReset();
  });
  test('canHandle returns true when the incoming request is for TrashPickupDayIntent and confirmationStatus is NONE', () => {
     handlerInput.requestEnvelope.request.dialogState = "STARTED";
    expect(StartedTrashPickupDayIntentHandler.canHandle(handlerInput)).toEqual(true);
  });
  test('checks if the address is available and within the city', async () => {
    helper.isHomeAddressAvailable.mockResolvedValue(true);
    helper.getHomeAddress.mockResolvedValue({ addressLine1: '123 Test Street' });
    helper.getOAuthToken.mockResolvedValue('fake-token');
    const mockValidatorRes = { 
    
          Address: '123 Main St',
          District: '1',
          FullAddress: '123 Main St, San Francisco, CA 94105',
          Validated: 'true',
          Score: '100',
          geocoderResponse: {},
          Similar_Cases: {},
          Within_City: true,
      };
      
  sfCase.mockImplementation(() => ({
    address_case_validator: jest.fn().mockResolvedValue(mockValidatorRes),
  }));
  const res = await sfCase().address_case_validator();

    const response = await StartedTrashPickupDayIntentHandler.handle(handlerInput);

    expect(helper.isHomeAddressAvailable).toHaveBeenCalled();
    expect(helper.getHomeAddress).toHaveBeenCalled();
    expect(helper.getOAuthToken).toHaveBeenCalled();
    expect(response.outputSpeech.ssml).toContain(
      'Sure! I found a city address associated with your Amazon account. Would you like to use it to check your garbage day?'
    );
  });

  test('asks for an address if the address is not available', async () => {
    helper.isHomeAddressAvailable.mockResolvedValue(false);

    const response = await StartedTrashPickupDayIntentHandler.handle(handlerInput);

    expect(helper.isHomeAddressAvailable).toHaveBeenCalled();
    expect(response.outputSpeech.ssml).toContain(
      'Sure, I can check any address within the city of Sacramento. What address should I check?'
    );
  });

  test('asks for an address if the address is available but not within the city', async () => {
    helper.isHomeAddressAvailable.mockResolvedValue(true);
    helper.getHomeAddress.mockResolvedValue({ addressLine1: '123 Test Street' });
    helper.getOAuthToken.mockResolvedValue('fake-token');
    const mockValidatorRes = { 
    
          Address: '123 Main St',
          District: '1',
          FullAddress: '123 Main St, San Francisco, CA 94105',
          Validated: 'true',
          Score: '100',
          geocoderResponse: {},
          Similar_Cases: {},
          Within_City: false,
      };
      
  sfCase.mockImplementation(() => ({
    address_case_validator: jest.fn().mockResolvedValue(mockValidatorRes),
  }));
  const res = await sfCase().address_case_validator();


    const response = await StartedTrashPickupDayIntentHandler.handle(handlerInput);

    expect(helper.isHomeAddressAvailable).toHaveBeenCalled();
    expect(helper.getHomeAddress).toHaveBeenCalled();
    expect(helper.getOAuthToken).toHaveBeenCalled();
    expect(response.outputSpeech.ssml).toContain(
      'Sure, I can check any address within the city of Sacramento. What address should I check?'
    );
  });
});
describe('InProgressTrashPickupDayIntentHandler', () => {
    // At the beginning of the test file
const consoleSpy = jest.spyOn(console, 'log');

// Clear all console.log calls after each test
afterEach(() => {
  consoleSpy.mockClear();
});
  test('canHandle returns true for correct IntentRequest, intent name, and dialog state', () => {
    const handlerInput = {
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'TrashPickupDayIntent',
          },
          dialogState: 'IN_PROGRESS',
        },
      },
    };

    const canHandleResult = InProgressTrashPickupDayIntentHandler.canHandle(handlerInput);
    expect(canHandleResult).toBe(true);
  });

  test('canHandle returns false for incorrect request type', () => {
    const handlerInput = {
      requestEnvelope: {
        request: {
          type: 'SomeOtherRequestType',
          intent: {
            name: 'TrashPickupDayIntent',
          },
          dialogState: 'IN_PROGRESS',
        },
      },
    };

    const canHandleResult = InProgressTrashPickupDayIntentHandler.canHandle(handlerInput);
    expect(canHandleResult).toBe(false);
  });

  test('canHandle returns false for incorrect intent name', () => {
    const handlerInput = {
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'SomeOtherIntent',
          },
          dialogState: 'COMPLETED',
        },
      },
    };

    const canHandleResult = InProgressTrashPickupDayIntentHandler.canHandle(handlerInput);
    expect(canHandleResult).toBe(false);
  });

  test('canHandle returns false for incorrect dialog state', () => {
    const handlerInput = {
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'TrashPickupDayIntent',
          },
          dialogState: 'COMPLETED',
        },
      },
    };

    const canHandleResult = InProgressTrashPickupDayIntentHandler.canHandle(handlerInput);
    expect(canHandleResult).toBe(true);
  });

  test('handle provides correct output when address is within the city and has service days', async () => {
    // Mock necessary functions and data
    helper.isHomeAddressAvailable = jest.fn().mockResolvedValue(true);
    helper.getHomeAddress = jest.fn().mockResolvedValue({ addressLine1: 'Test Address' });
    helper.getOAuthToken = jest.fn().mockResolvedValue('Test Token');

    sfCase.mockImplementation(() => {
      return {
        address_case_validator: jest.fn().mockResolvedValue({
          Within_City: true,
          geocoderResponse: {
            internal_geocoder: {
              candidates: [{
                attributes: {
                  Addr_type: 'Address',
                  User_fld: 12345,
                },
              }],
            },
          },
        }),
      };
    });
    const handlerInput = {
      attributesManager: {
        getSessionAttributes: () => ({
          confirmedValidatorRes: {
            Address: '123 Main St',
            District: '1',
            FullAddress: '123 Main St, San Francisco, CA 94105',
            Validated: 'true',
            Score: '100',
            geocoderResponse: {
              internal_geocoder: {
                candidates: [{
                  attributes: {
                    Addr_type: 'Address',
                    User_fld: 12345,

            }}]}},
            Similar_Cases: {},
            Within_City: true,
          },
          caseObj: {
            token: "test-token",
            sf_url: process.env.SALESFORCE_URL,
            json_input: {},
            mapped: {},
          },

        }),
        setSessionAttributes: jest.fn(),
      },
      responseBuilder: Alexa.ResponseFactory.init(),
    
    };
    sfCase.mockImplementation(() => {
      return {
        overlay: jest.fn().mockResolvedValue({
          internal_geocoder: {
            candidates: [{
              attributes: {
                Addr_type: 'Address',
                User_fld: 12345,

        }}]},
        dtpr: true
        }),
      }
    });

          
  




    axios.get.mockResolvedValue({
      data: {
        features: [{
          attributes: {
            GARBAGE_DAY: 'MON-Test',
            RECYCLE_DAY: 'TUE-Test',
          },
        }],
      },
    });



    
    
 


   const output = await InProgressTrashPickupDayIntentHandler.handle(handlerInput);
   expect(output).toEqual({
    outputSpeech: {
      ssml: "<speak>Your garbage service day is every Monday. Your recycling service day is every other Tuesday. Is there anything else I can help you with?</speak>",
      type: 'SSML',
    },
    shouldEndSession: false,
  });
  
    
   
  });

  test('handle provides correct output when address is within the city but has no service days', async () => {
    // Mock necessary functions and data
    helper.isHomeAddressAvailable = jest.fn().mockResolvedValue(true);
    helper.getHomeAddress = jest.fn().mockResolvedValue({ addressLine1: 'Test Address' });
    helper.getOAuthToken = jest.fn().mockResolvedValue('Test Token');
    sfCase.mockImplementation(() => {
      return {
        address_case_validator: jest.fn().mockResolvedValue({
          Within_City: true,
          geocoderResponse: {
            internal_geocoder: {
              candidates: [{
                attributes: {
                  Addr_type: 'Trash',
                  User_fld: 12345,
                },
              }],
            },
          },
        }),
      };
    });
    sfCase.mockImplementation(() => {
      return {
        overlay: jest.fn().mockResolvedValue({
          internal_geocoder: {
            candidates: [{
              attributes: {
                Addr_type: 'Address',
                User_fld: 12345,

        }}]},
        dtpr: true
        }),
      }
    });

          
  
 
    axios.get.mockResolvedValue({
      data: {
        features: [{
          attributes: {
            GARBAGE_DAY: 'MON-Test',
            RECYCLE_DAY: 'TUE-Test',
          },
        }],
      },
    });

    const handlerInput = {
      attributesManager: {
        getSessionAttributes: () => ({
          confirmedValidatorRes: {
            Address: '123 Main St',
            District: '1',
            FullAddress: '123 Main St, San Francisco, CA 94105',
            Validated: 'true',
            Score: '100',
            geocoderResponse: {
              internal_geocoder: {
                candidates: [{
                  attributes: {
                    Addr_type: 'trash',
                    User_fld: 12345,

            }}]}},
            Similar_Cases: {},
            Within_City: true,
          },
          caseObj: {
            token: "test-token",
            sf_url: process.env.SALESFORCE_URL,
            json_input: {},
            mapped: {},
          },
        }),
        setSessionAttributes: jest.fn(),
      },
      responseBuilder: Alexa.ResponseFactory.init(),
    };

   const output = await InProgressTrashPickupDayIntentHandler.handle(handlerInput);
    expect(output).toEqual({
      outputSpeech: {
        ssml: "<speak>I'm sorry, I cannot retrieve a pickup day for that address. Is there anything else I can help you with?</speak>",
        type: 'SSML',
      },
      shouldEndSession: false,
    });
    
  });

  test('handle provides correct output when address is not within the city', async () => {
    // Mock necessary functions and data
    helper.isHomeAddressAvailable = jest.fn().mockResolvedValue(true);
    helper.getHomeAddress = jest.fn().mockResolvedValue({ addressLine1: 'Test Address' });
    sfCase.mockImplementation(() => {
      return {
        address_case_validator: jest.fn().mockResolvedValue({
          Within_City: true,
        }),
      };
    });
    sfCase.mockImplementation(() => {
      return {
        overlay: jest.fn().mockResolvedValue({
          internal_geocoder: {
            candidates: [{
              attributes: {
                Addr_type: 'Address',
                User_fld: 12345,

        }}]},
        dtpr: false
        }),
      }
    });

    axios.get.mockResolvedValue({
      layer0: {
        features: [{
          attributes: {
            GARBAGE_DAY: 'MON-Test',
            RECYCLE_DAY: 'TUE-Test',
          },
        }],
      },
    });
  
    const handlerInput = {
      attributesManager: {
        getSessionAttributes: () => ({
          confirmedValidatorRes: {
            Address: '123 Main St',
            District: '1',
            FullAddress: '123 Main St, San Francisco, CA 94105',
            Validated: 'true',
            Score: '100',
            geocoderResponse: {
              internal_geocoder: {
                candidates: [{
                  attributes: {
                    Addr_type: 'Address',
                    User_fld: 12345,

            }}]}},
            Similar_Cases: {},
            Within_City: true,
          },
          caseObj: {
            token: "test-token",
            sf_url: process.env.SALESFORCE_URL,
            json_input: {},
            mapped: {},
          },
         
        }),
        setSessionAttributes: jest.fn(),
      },
      responseBuilder: Alexa.ResponseFactory.init(),
    };

   const output = await InProgressTrashPickupDayIntentHandler.handle(handlerInput);

    expect(output).toEqual({
      outputSpeech: {
        ssml: "<speak>Your garbage service day is every undefined. Your recycling service day is every other undefined. Is there anything else I can help you with?</speak>",
        type: 'SSML',
      },
      shouldEndSession: false,
    });
  });
  test("handle provides correct output when there isn't a garbage day", async () => {
    // Mock necessary functions and data
    helper.isHomeAddressAvailable = jest.fn().mockResolvedValue(true);
    helper.getHomeAddress = jest.fn().mockResolvedValue({ addressLine1: 'Test Address' });
    sfCase.mockImplementation(() => {
      return {
        address_case_validator: jest.fn().mockResolvedValue({
          Within_City: true,
        }),
      };
    });
    sfCase.mockImplementation(() => {
      return {
        overlay: jest.fn().mockResolvedValue({
          internal_geocoder: {
            candidates: [{
              attributes: {
                Addr_type: 'Address',
                User_fld: 12345,

        }}]},
        dtpr: true
        }),
      }
    });

    axios.get.mockResolvedValue({
      layer0: {
        features: [{
          attributes: {
            GARBAGE_DAY: 'MON-Test',
            RECYCLE_DAY: 'TUE-Test',
          },
        }],
      },
    });
  
    const handlerInput = {
      attributesManager: {
        getSessionAttributes: () => ({
          confirmedValidatorRes: {
            Address: '123 Main St',
            District: '1',
            FullAddress: '123 Main St, San Francisco, CA 94105',
            Validated: 'true',
            Score: '100',
            geocoderResponse: {
              internal_geocoder: {
                candidates: [{
                  attributes: {
                    Addr_type: 'Address',
                    User_fld: 12345,

            }}]}},
            Similar_Cases: {},
            Within_City: true,
          },
          caseObj: {
            token: "test-token",
            sf_url: process.env.SALESFORCE_URL,
            json_input: {},
            mapped: {},
          },
        
        }),
        setSessionAttributes: jest.fn(),
      },
      responseBuilder: Alexa.ResponseFactory.init(),
    };

   const output = await InProgressTrashPickupDayIntentHandler.handle(handlerInput);

    expect(output).toEqual({
      outputSpeech: {
        ssml: "<speak>I'm sorry, I wasn't able to find a service day for that address. Is there anything else I can help you with?</speak>",
        type: 'SSML',
      },
      shouldEndSession: false,
    });
  });

  test('handle asks for an address if the address is not available', async () => {
    const handlerInput = {
      attributesManager: {
        getSessionAttributes: () => ({
          confirmedValidatorRes: {
            Address: '123 Main St',
            District: '1',
            FullAddress: '123 Main St, San Francisco, CA 94105',
            Validated: 'true',
            Score: '100',
            geocoderResponse: {},
            Similar_Cases: {},
            Within_City: true,
          },
        }),
        setSessionAttributes: jest.fn(),
      },
      responseBuilder: Alexa.ResponseFactory.init(),
    };
   
    const output = await InProgressTrashPickupDayIntentHandler.handle(handlerInput);
    expect(output).toEqual({
      outputSpeech: {
        ssml: "<speak>I'm sorry, I wasn't able to find a service day for that address. Is there anything else I can help you with?</speak>",
        type: 'SSML',
      },
      shouldEndSession: false,
    });
    
  });

  test('fetchData returns data on successful request', async () => {
    const user_fld = 'some_id';
    const url = `${process.env.INTERNAL_GIS_ENDPOINT}/arcgis/rest/services/GenericOverlay/FeatureServer/37/query?where=ADDRESSID = ${user_fld}&outFields=*&f=pjson`;
  
    const mockResponse = { data: 'some data' };
  
    // Mock successful axios call
    axios.get.mockResolvedValueOnce(mockResponse);
  
    const result = await fetchData(user_fld);
    expect(result).toEqual(mockResponse);
    expect(axios.get).toHaveBeenCalledWith(encodeURI(url), expect.any(Object));
  });

  test('fetchData throws error when response contains error', async () => {
    const handlerInput = {
      attributesManager: {
        getSessionAttributes: () => ({
          confirmedValidatorRes: {
            Address: '123 Main St',
            District: '1',
            FullAddress: '123 Main St, San Francisco, CA 94105',
            Validated: 'true',
            Score: '100',
            geocoderResponse: {
              internal_geocoder: {
                candidates: [{
                  attributes: {
                    Addr_type: 'trash',
                    User_fld: 12345,

            }}]}},
            Similar_Cases: {},
            Within_City: true,
          },
          caseObj: {
            token: "test-token",
            sf_url: process.env.SALESFORCE_URL,
            json_input: {},
            mapped: {},
          },
        }),
        setSessionAttributes: jest.fn(),
      },
      responseBuilder: Alexa.ResponseFactory.init(),
    };
    const user_fld = handlerInput.attributesManager.getSessionAttributes().confirmedValidatorRes.geocoderResponse.internal_geocoder.candidates[0].attributes.User_fld;

    const url = `${process.env.INTERNAL_GIS_ENDPOINT}/arcgis/rest/services/GenericOverlay/FeatureServer/37/query?where=ADDRESSID = ${user_fld}&outFields=*&f=pjson`;
  
    const mockErrorResponse = { response: { data: 'error data', status: 500 } };
  
    // Mock error response axios call
    axios.get.mockRejectedValueOnce(mockErrorResponse);
  
    try {
      await fetchData(user_fld);
    } catch (error) {
      expect(error.message).toEqual(mockErrorResponse.response.data);
    }
  
    expect(axios.get).toHaveBeenCalledWith(encodeURI(url), expect.any(Object));
    expect(consoleSpy).toHaveBeenCalledWith(mockErrorResponse.response.data);
  expect(consoleSpy).toHaveBeenCalledWith(mockErrorResponse.response.status);
  });
  test('fetchData logs and throws error on API error', async () => {
    const handlerInput = {
      attributesManager: {
        getSessionAttributes: () => ({
          confirmedValidatorRes: {
            Address: '123 Main St',
            District: '1',
            FullAddress: '123 Main St, San Francisco, CA 94105',
            Validated: 'true',
            Score: '100',
            geocoderResponse: {
              internal_geocoder: {
                candidates: [{
                  attributes: {
                    Addr_type: 'trash',
                    User_fld: 12345,

            }}]}},
            Similar_Cases: {},
            Within_City: true,
          },
          caseObj: {
            token: "test-token",
            sf_url: process.env.SALESFORCE_URL,
            json_input: {},
            mapped: {},
          },
        }),
        setSessionAttributes: jest.fn(),
      },
      responseBuilder: Alexa.ResponseFactory.init(),
    };
    const user_fld = handlerInput.attributesManager.getSessionAttributes().confirmedValidatorRes.geocoderResponse.internal_geocoder.candidates[0].attributes.User_fld;
    const apiError = {
      response: {
        data: 'API Error',
        status: 500,
      },
    };
  
    axios.get.mockRejectedValueOnce(apiError);
  
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  
    try {
      await fetchData(user_fld);
    } catch (error) {
      expect(error.message).toEqual(apiError.response.data);
    }
  
    expect(axios.get).toHaveBeenCalledTimes(5);
    expect(consoleSpy).toHaveBeenCalledWith(apiError.response.data);
    expect(consoleSpy).toHaveBeenCalledWith(apiError.response.status);
  
    consoleSpy.mockRestore();
  });
  
});  
// Mock handlerInput
const MockhandlerInput = {
  attributesManager: {
    getSessionAttributes: jest.fn(),
    setSessionAttributes: jest.fn(),
  },
  requestEnvelope: {
    request: {
      type: "IntentRequest",
    },
  },
  responseBuilder: Alexa.ResponseFactory.init(),
};


// Test cases
describe("yn_UseHomeAddressForGarbageDayIntentHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("canHandle returns true for AMAZON.YesIntent and UseHomeAddressForGarbage? question", () => {
    MockhandlerInput.requestEnvelope.request.intent = { name: "AMAZON.YesIntent" };
    MockhandlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: "UseHomeAddressForGarbage?" });

    expect(yn_UseHomeAddressForGarbageDayIntentHandler.canHandle(MockhandlerInput)).toBe(true);
  });

  test("canHandle returns true for AMAZON.NoIntent and UseHomeAddressForGarbage? question", () => {
    MockhandlerInput.requestEnvelope.request.intent = { name: "AMAZON.NoIntent" };
    MockhandlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: "UseHomeAddressForGarbage?" });

    expect(yn_UseHomeAddressForGarbageDayIntentHandler.canHandle(MockhandlerInput)).toBe(true);
  });

  test("canHandle returns false for incorrect intent name", () => {
    MockhandlerInput.requestEnvelope.request.intent = { name: "AnotherIntent" };
    MockhandlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: "UseHomeAddressForGarbage?" });

    expect(yn_UseHomeAddressForGarbageDayIntentHandler.canHandle(MockhandlerInput)).toBe(false);
  });

  test("canHandle returns false for incorrect questionAsked", () => {
    MockhandlerInput.requestEnvelope.request.intent = { name: "AMAZON.YesIntent" };
    MockhandlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: "AnotherQuestion?" });

    expect(yn_UseHomeAddressForGarbageDayIntentHandler.canHandle(MockhandlerInput)).toBe(false);
  });

  test("handle responds with delegate directive for AMAZON.YesIntent", async () => {
    MockhandlerInput.requestEnvelope.request.intent = { name: "AMAZON.YesIntent" };
    MockhandlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: "UseHomeAddressForGarbage?" });

    const response = await yn_UseHomeAddressForGarbageDayIntentHandler.handle(MockhandlerInput);
    expect(response.directives[0].type).toBe("Dialog.Delegate");
    expect(response.directives[0].updatedIntent.name).toBe("TrashPickupDayIntent");
  });

  test("handle responds with elicit slot directive for AMAZON.NoIntent", async () => {
    MockhandlerInput.requestEnvelope.request.intent = { name: "AMAZON.NoIntent" };
    MockhandlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: "UseHomeAddressForGarbage?" });

    const response = await yn_UseHomeAddressForGarbageDayIntentHandler.handle(MockhandlerInput);
    expect(response.outputSpeech.ssml).toContain("What address should I check?");
    expect(response.directives[0].type).toBe("Dialog.Delegate");
    expect(response.directives[0].updatedIntent.name).toBe("TrashPickupDayIntent");
  });
});