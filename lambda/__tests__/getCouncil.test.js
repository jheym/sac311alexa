const Alexa = require('ask-sdk-core');
const helper = require('../helper/helperFunctions.js');
const sfCase = require('../helper/SalesforceCaseObject.js');
const StartedGetCouncilDistrictIntentHandler = require('../informationalIntents/getCouncilDistrict.js').StartedGetCouncilDistrictIntentHandler;
const InProgressGetCouncilDistrictIntentHandler = require('../informationalIntents/getCouncilDistrict.js').InProgressGetCouncilDistrictIntentHandler;
const yn_UseHomeAddressForCouncilDistrictIntentHandler = require('../informationalIntents/getCouncilDistrict.js').yn_UseHomeAddressForCouncilDistrictIntentHandler;
const axios = require('axios');
jest.mock('../helper/helperFunctions.js');
jest.mock('../helper/SalesforceCaseObject.js');
jest.mock('axios');

describe('StartedGetCouncilDistrictIntentHandler', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('canHandle returns true when the intent is GetCouncilDistrictIntent and dialog state is STARTED', () => {
    const handlerInput = {
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'GetCouncilDistrictIntent',
            confirmationStatus: 'NONE',
            slots: {},
          },
          dialogState: 'STARTED',
        },
      },
    };

    expect(StartedGetCouncilDistrictIntentHandler.canHandle(handlerInput)).toBe(true);
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
        getSessionAttributes: () => ({ intentToRestore: 'GetCouncilDistrictIntent' }),
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

    const response = await StartedGetCouncilDistrictIntentHandler.handle(handlerInput);
    expect(response.outputSpeech.ssml).toContain('<speak>Sure! I found a city address associated with your Amazon account. Would you like to use it to check your council district?</speak>');
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
        getSessionAttributes: () => ({ intentToRestore: 'GetCouncilDistrictIntent' }),
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

    const response = await StartedGetCouncilDistrictIntentHandler.handle(handlerInput);
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
        getSessionAttributes: () => ({ intentToRestore: 'GetCouncilDistrictIntent' }),
        setSessionAttributes: jest.fn(),
      },
    };

    helper.isHomeAddressAvailable.mockResolvedValue(false);

    const response = await StartedGetCouncilDistrictIntentHandler.handle(handlerInput);
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
        getSessionAttributes: () => ({ intentToRestore: 'GetCouncilDistrictIntent' }),
        setSessionAttributes: jest.fn(),
      },
      t: jest.fn((key) => key),
    };

  

    const response = await StartedGetCouncilDistrictIntentHandler.handle(handlerInput);
    expect(response.outputSpeech.ssml).toContain('What address should I check?');
  });
});

describe('InProgressGetCouncilDistrictIntentHandler', () => {
    test('canHandle returns true when the intent is GetCouncilDistrictIntent and dialog state is IN_PROGRESS', () => {
        const handlerInput = {
            requestEnvelope: {
                request: {
                    type: 'IntentRequest',
                    intent: {
                        name: 'GetCouncilDistrictIntent',
                        confirmationStatus: 'NONE',
                        slots: {},
                    },
                    dialogState: 'IN_PROGRESS',
                },
            },
        };

        expect(InProgressGetCouncilDistrictIntentHandler.canHandle(handlerInput)).toBe(true);

    });

    test('handle with a valid council district', async () => {
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
                id: 8,
                features: [
                  {
                    attributes: {
                      DISTNUM: 5,
                      NAME: 'John Doe',
                    },
                  },
                ],
              },
            ],
          },
        });
      
        const response = await InProgressGetCouncilDistrictIntentHandler.handle(handlerInput);
        expect(response.outputSpeech.ssml).toContain('The council district for the location you gave is district <say-as interpret-as="spell-out">5</say-as>, and the district member is John Doe.');
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
  
      const response = await InProgressGetCouncilDistrictIntentHandler.handle(handlerInput);
      expect(response.outputSpeech.ssml).toContain("<speak>Sorry, I cannot retrieve a council district for the location you gave, as it is not within the City of Sacramento. Is there anything else I can help you with?</speak>");
    });
  
    test('handle with an error fetching council', async () => {
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
  
      axios.get.mockRejectedValue(new Error('Error fetching Council District'));
  
      const response = await InProgressGetCouncilDistrictIntentHandler.handle(handlerInput);
      expect(response.outputSpeech.ssml).toContain("<speak>I'm sorry, something went wrong on my end. I cannot retrieve a council district for your address. Is there anything else I can help you with?</speak>");
    });
  });
  describe('yn_UseHomeAddressForCouncilDistrictIntentHandler', () => {
    const handlerInput = {
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
        },
      },
      responseBuilder: Alexa.ResponseFactory.init(),
      attributesManager: {
        getSessionAttributes: () => ({
          questionAsked: 'UseHomeAddressCouncilDistrict?',
        }),
        setSessionAttributes: () => {},
      },
    };
    test('canHandle returns true when the intent is AMAZON.YesIntent and questionAsked is UseHomeAddressCouncilDistrict?', () => {
        handlerInput.requestEnvelope.request.intent = {
            name: 'AMAZON.YesIntent',
        };

        expect(yn_UseHomeAddressForCouncilDistrictIntentHandler.canHandle(handlerInput)).toBe(true);
    });
    test('canHandle returns true when the intent is AMAZON.YesIntent and questionAsked is UseHomeAddressCouncilDistrict?', () => {
        handlerInput.requestEnvelope.request.intent = {
            name: 'AMAZON.NoIntent',
        };

        expect(yn_UseHomeAddressForCouncilDistrictIntentHandler.canHandle(handlerInput)).toBe(true);
    });
    
    test('handle with AMAZON.NoIntent', async () => {
        handlerInput.requestEnvelope.request.intent = {
          name: 'AMAZON.NoIntent',
        };
    
        const response = await yn_UseHomeAddressForCouncilDistrictIntentHandler.handle(handlerInput);
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
  
      const response = await yn_UseHomeAddressForCouncilDistrictIntentHandler.handle(handlerInput);

      expect(response.directives[0].type).toEqual('Dialog.ElicitSlot');
      expect(response.directives[0].updatedIntent.name).toEqual('GetLocationFromUserIntent');
    });
  
  });