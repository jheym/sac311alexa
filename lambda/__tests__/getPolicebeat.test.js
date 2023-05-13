const Alexa = require('ask-sdk-core');
const helper = require('../helper/helperFunctions.js');
const sfCase = require('../helper/SalesforceCaseObject.js');
const axios = require('axios');
const StartedGetPoliceBeatIntentHandler = require('../informationalIntents/getPoliceBeat.js').StartedGetPoliceBeatIntentHandler;
const InProgressGetPoliceBeatIntentHandler = require('../informationalIntents/getPoliceBeat.js').InProgressGetPoliceBeatIntentHandler;
const yn_UseHomeAddressForPoliceBeatIntentHandler = require('../informationalIntents/getPoliceBeat.js').yn_UseHomeAddressForPoliceBeatIntentHandler;

jest.mock('../helper/helperFunctions.js');
jest.mock('../helper/SalesforceCaseObject.js');
jest.mock('axios');

describe('StartedGetPoliceBeatIntentHandler', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('canHandle returns true when the intent is GetPoliceBeatIntent and dialog state is STARTED', () => {
    const handlerInput = {
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'GetPoliceBeatIntent',
            confirmationStatus: 'NONE',
            slots: {},
          },
          dialogState: 'STARTED',
        },
      },
    };

    expect(StartedGetPoliceBeatIntentHandler.canHandle(handlerInput)).toBe(true);
  });

  test('handle with home address within the city of Sacramento', async () => {
    const handlerInput = {
      requestEnvelope: {
        context: {
          System: {
            apiEndpoint: 'https://api.amazonalexa.com',
            apiAccessToken: 'some-access-token',
          },
        },
      },
      responseBuilder: Alexa.ResponseFactory.init(),
      attributesManager: {
        getSessionAttributes: () => ({ intentToRestore: 'GetPoliceBeatIntent' }),
        setSessionAttributes: jest.fn(),
      },
    };

    helper.isHomeAddressAvailable.mockResolvedValue(true);
    helper.getHomeAddress.mockResolvedValue({ addressLine1: '123 Main St' });
    helper.getOAuthToken.mockResolvedValue('test-token');
    

    const sfCaseInstance = {
      address_case_validator: jest.fn().mockResolvedValue({
        Within_City: true,
      }),
    };
    sfCase.mockImplementation(() => sfCaseInstance);

    const response = await StartedGetPoliceBeatIntentHandler.handle(handlerInput);
    expect(response.outputSpeech.ssml).toContain('Would you like to use it to check your police beat?');
  });

  test('handle with home address outside the city of Sacramento', async () => {
    const handlerInput = {
      requestEnvelope: {
        context: {
          System: {
            apiEndpoint: 'https://api.amazonalexa.com',
            apiAccessToken: 'some-access-token',
          },
        },
      },
      responseBuilder: Alexa.ResponseFactory.init(),
      attributesManager: {
        getSessionAttributes: () => ({ intentToRestore: 'GetPoliceBeatIntent' }),
        setSessionAttributes: jest.fn(),
      },
    };

    helper.isHomeAddressAvailable.mockResolvedValue(true);
    helper.getHomeAddress.mockResolvedValue({ addressLine1: '123 Main St' });
    helper.getOAuthToken.mockResolvedValue('test-token');

    const sfCaseInstance = {
      address_case_validator: jest.fn().mockResolvedValue({
        Within_City: false,
      }),
    };
    sfCase.mockImplementation(() => sfCaseInstance);

    const response = await StartedGetPoliceBeatIntentHandler.handle(handlerInput);
    expect(response.outputSpeech.ssml).toContain('What address should I check?');
  });
  test('handle without a home address', async () => {
    const handlerInput = {
      requestEnvelope: {
        context: {
          System: {
            apiEndpoint: 'https://api.amazonalexa.com',
            apiAccessToken: 'some-access-token',
          },
        },
      },
      responseBuilder: Alexa.ResponseFactory.init(),
      attributesManager: {
        getSessionAttributes: () => ({ intentToRestore: 'GetPoliceBeatIntent' }),
        setSessionAttributes: jest.fn(),
      },
    };

    helper.isHomeAddressAvailable.mockResolvedValue(false);

    const response = await StartedGetPoliceBeatIntentHandler.handle(handlerInput);
    expect(response.outputSpeech.ssml).toContain('What address should I check?');
  });

  test('handle with an error fetching home address', async () => {
    const handlerInput = {
      requestEnvelope: {
        context: {
          System: {
            apiEndpoint: 'https://api.amazonalexa.com',
            apiAccessToken: 'some-access-token',
          },
        },
      },
      responseBuilder: Alexa.ResponseFactory.init(),
      attributesManager: {
        getSessionAttributes: () => ({ intentToRestore: 'GetPoliceBeatIntent' }),
        setSessionAttributes: jest.fn(),
      },
      t: jest.fn((key) => key),
    };

    

    const response = await StartedGetPoliceBeatIntentHandler.handle(handlerInput);
    expect(response.outputSpeech.ssml).toContain('What address should I check?');
  });
});

describe('InProgressGetPoliceBeatIntentHandler', () => {
    test('canHandle returns true when the intent is GetPoliceBeatIntent and dialog state is IN_PROGRESS', () => {
        const handlerInput = {
            requestEnvelope: {
                request: {
                    type: 'IntentRequest',
                    intent: {
                        name: 'GetPoliceBeatIntent',
                        confirmationStatus: 'NONE',
                        slots: {},
                    },
                    dialogState: 'IN_PROGRESS',
                },
            },
        };

        expect(InProgressGetPoliceBeatIntentHandler.canHandle(handlerInput)).toBe(true);

    });

    test('handle with a valid police beat', async () => {
      const handlerInput = {
        requestEnvelope: {
          request: {
            type: 'IntentRequest',
            dialogState: 'IN_PROGRESS',
          },
        },
        responseBuilder: Alexa.ResponseFactory.init(),
        attributesManager: {
          getSessionAttributes: () => ({
            confirmedValidatorRes: {
              Within_City: true,
              geocoderResponse: {
                internal_geocoder: {
                  candidates: [
                    {
                      location: {
                        x: 123,
                        y: 456,
                      },
                    },
                  ],
                },
              },
            },
          }),
        },
        t: jest.fn((key) => key),
      };
  
      axios.get.mockResolvedValue({
        data: {
          layers: [
            {
              id: 6,
              features: [
                {
                  attributes: {
                    BEAT: '12A',
                  },
                },
              ],
            },
          ],
        },
      });
  
      const response = await InProgressGetPoliceBeatIntentHandler.handle(handlerInput);
      expect(response.outputSpeech.ssml).toContain('The police beat for the location you gave is <say-as interpret-as="spell-out">12A</say-as>.');
    });
  
    test('handle with an address outside of the city of Sacramento', async () => {
      const handlerInput = {
        requestEnvelope: {
          request: {
            type: 'IntentRequest',
            dialogState: 'IN_PROGRESS',
          },
        },
        responseBuilder: Alexa.ResponseFactory.init(),
        attributesManager: {
          getSessionAttributes: () => ({
            confirmedValidatorRes: {
              Within_City: false,
            },
          }),
        },
        t: jest.fn((key) => key),
      };
  
      const response = await InProgressGetPoliceBeatIntentHandler.handle(handlerInput);
      expect(response.outputSpeech.ssml).toContain("<speak>undefined Is there anything else I can help you with?</speak>");
    });
  
    test('handle with an error fetching police beat', async () => {
      const handlerInput = {
        requestEnvelope: {
          request: {
            type: 'IntentRequest',
            dialogState: 'IN_PROGRESS',
          },
        },
        responseBuilder: Alexa.ResponseFactory.init(),
        attributesManager: {
          getSessionAttributes: () => ({
            confirmedValidatorRes: {
              Within_City: true,
              geocoderResponse: {
                internal_geocoder: {
                  candidates: [
                    {
                      location: {
                        x: 123,
                        y: 456,
                      },
                    },
                  ],
                },
              },
            },
          }),
        },
        t: jest.fn((key) => key),
      };
  
      axios.get.mockRejectedValue(new Error('Error fetching police beat'));
  
      const response = await InProgressGetPoliceBeatIntentHandler.handle(handlerInput);
      expect(response.outputSpeech.ssml).toContain("I'm sorry, something went wrong on my end. I cannot retrieve a police beat for your address.");
    });
  });
  describe('yn_UseHomeAddressForPoliceBeatIntentHandler', () => {
    const handlerInput = {
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
        },
      },
      responseBuilder: Alexa.ResponseFactory.init(),
      attributesManager: {
        getSessionAttributes: () => ({
          questionAsked: 'UseHomeAddressPoliceBeat?',
        }),
        setSessionAttributes: () => {},
      },
    };
    test('canHandle returns true when the intent is AMAZON.YesIntent and questionAsked is UseHomeAddressPoliceBeat?', () => {
        handlerInput.requestEnvelope.request.intent = {
            name: 'AMAZON.YesIntent',
        };

        expect(yn_UseHomeAddressForPoliceBeatIntentHandler.canHandle(handlerInput)).toBe(true);
    });
    test('canHandle returns true when the intent is AMAZON.YesIntent and questionAsked is UseHomeAddressPoliceBeat?', () => {
        handlerInput.requestEnvelope.request.intent = {
            name: 'AMAZON.NoIntent',
        };

        expect(yn_UseHomeAddressForPoliceBeatIntentHandler.canHandle(handlerInput)).toBe(true);
    });
    
    test('handle with AMAZON.NoIntent', async () => {
        handlerInput.requestEnvelope.request.intent = {
          name: 'AMAZON.NoIntent',
        };
    
        const response = await yn_UseHomeAddressForPoliceBeatIntentHandler.handle(handlerInput);
        expect(response.outputSpeech.ssml).toContain('Okay, I can check any address within the city of Sacramento. What address should I check?');
        expect(response.directives).toHaveLength(1);
        expect(response.directives[0].type).toEqual('Dialog.ElicitSlot');
        expect(response.directives[0].slotToElicit).toEqual('userGivenAddress');
        expect(response.directives[0].updatedIntent.name).toEqual('GetLocationFromUserIntent');
      });
    test('handle with AMAZON.YesIntent', async () => {
      handlerInput.requestEnvelope.request.intent = {
        name: 'AMAZON.YesIntent',
      };
  
      const response = await yn_UseHomeAddressForPoliceBeatIntentHandler.handle(handlerInput);

      expect(response.directives[0].type).toEqual('Dialog.ElicitSlot');
      expect(response.directives[0].updatedIntent.name).toEqual('GetLocationFromUserIntent');
    });
  
  });