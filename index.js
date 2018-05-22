// This is template files for developing Alexa skills

'use strict';

const winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ prettyPrint: true, timestamp: true, json: false, stderrLevels:['error']})
    ]
  });

var intentHandlers = {};

if(process.env.NODE_DEBUG_EN) {
  logger.level = 'debug';
}


exports.handler = (event, context, callback) => {
    try {

        logger.info('event.session.application.applicationId=' + event.session. application.applicationId);

        if (APP_ID !== '' && event.session.application.applicationId !== APP_ID) {
            context.fail('Invalid Application ID');
         }
      
        if (!event.session.attributes) {
            event.session.attributes = {};
        }

        logger.debug('Incoming request:\n', JSON.stringify(event,null,2));

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }


        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request, event.session, new Response(context,event.session));
        } else if (event.request.type === 'IntentRequest') {
            var response =  new Response(context,event.session);
            if (event.request.intent.name in intentHandlers) {
              intentHandlers[event.request.intent.name](event.request, event.session, response,getSlots(event.request));
            } else {
              response.speechText = 'Unknown intent';
              response.shouldEndSession = true;
              response.done();
            }
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail('Exception: ' + getError(e));
    }
};

var getSlots = (req) => {
  var slots = {}
  for(var key in req.intent.slots) {
    slots[key] = req.intent.slots[key].value;
  }
  return slots;
}

var Response = class {
  constructor(context, session) {
    this.speechText = '';
    this.shouldEndSession = true;
    this.ssmlEn = true;
    this._context = context;
    this._session = session;

    this.done = (options) => {

      if(options && options.speechText) {
        this.speechText = options.speechText;
      }

      if(options && options.repromptText) {
        this.repromptText = options.repromptText;
      }

      if(options && options.ssmlEn) {
        this.ssmlEn = options.ssmlEn;
      }

      if(options && options.shouldEndSession) {
        this.shouldEndSession = options.shouldEndSession;
      }

      this._context.succeed(buildAlexaResponse(this));
    }

    this.fail = (msg) => {
      logger.error(msg);
      this._context.fail(msg);
    }
  }
};

var createSpeechObject = (text,ssmlEn) => {
  if(ssmlEn) {
    return {
      type: 'SSML',
      ssml: '<speak>'+text+'</speak>'
    }
  } else {
    return {
      type: 'PlainText',
      text: text
    }
  }
}

var buildAlexaResponse = (response) => {
  var alexaResponse = {
    version: '1.0',
    response: {
      outputSpeech: createSpeechObject(response.speechText,response.ssmlEn),
      shouldEndSession: response.shouldEndSession
    }
  };

  if(response.repromptText) {
    alexaResponse.response.reprompt = {
      outputSpeech: createSpeechObject(response.repromptText,response.ssmlEn)
    };
  }

  if(response.cardTitle) {
    alexaResponse.response.card = {
      type: 'Simple',
      title: response.cardTitle
    };

    if(response.imageUrl) {
      alexaResponse.response.card.type = 'Standard';
      alexaResponse.response.card.text = response.cardContent;
      alexaResponse.response.card.image = {
        smallImageUrl: response.imageUrl,
        largeImageUrl: response.imageUrl
      };
    } else {
      alexaResponse.response.card.content = response.cardContent;
    }
  }

  if (!response.shouldEndSession && response._session && response._session.attributes) {
    alexaResponse.sessionAttributes = response._session.attributes;
  }
  logger.debug('Final response:\n', JSON.stringify(alexaResponse,null,2),'\n\n');
  return alexaResponse;
}

var getError = (err) => {
  var msg='';
  if (typeof err === 'object') {
    if (err.message) {
      msg = ': Message : ' + err.message;
    }
    if (err.stack) {
      msg += '\nStacktrace:';
      msg += '\n====================\n';
      msg += err.stack;
    }
  } else {
    msg = err;
    msg += ' - This error is not object';
  }
  return msg;
}


//--------------------------------------------- Skill specific logic starts here ----------------------------------------- 

//Add your skill application ID from amazon devloper portal
var APP_ID = 'amzn1.ask.skill.2bc3ed55-95ff-4e45-9f9b-7d15487b6cb9';

var onSessionStarted = (sessionStartedRequest, session) => {
    logger.debug('onSessionStarted requestId=' + sessionStartedRequest.requestId + ', sessionId=' + session.sessionId);
    // add any session init logic here
    
}

var onSessionEnded = (sessionEndedRequest, session) => {
  logger.debug('onSessionEnded requestId=' + sessionEndedRequest.requestId + ', sessionId=' + session.sessionId);
  // Add any cleanup logic here
  
}

var onLaunch = (launchRequest, session, response) => {
  logger.debug('onLaunch requestId=' + launchRequest.requestId + ', sessionId=' + session.sessionId);
  response.speechText = 'Welcome to email checker skill. You can use this skill to check your gmail unread messages. You can say, whats new?';
  response.repromptText = 'What do you want to do? whats new to check your unread messages.';
  response.shouldEndSession = false;
  response.done();
}


/** For each intent write a intentHandlers
Example:
intentHandlers['HelloIntent'] = (request,session,response,slots) => {
  //Intent logic
  
}
**/

intentHandlers['EmailCheckIntent'] = (reqest, session, response, slots) => {
  getMessages(response, session);
}

const https = require('https');
const Promise = require('bluebird');
const MAX_READ_MESSAGES = 3;
const MAX_MESSAGES = 20;

var getMessages = (response, session) => {
  var url;
  // from gmail api reference - users.messages -> list -> http request
  url = `https://www.googleapis.com/gmail/v1/users/me/messages?access_token=${session.user.accessToken}&q="is:unread"`;
  console.log('url: ', url);
  logger.debug(url);
  https.get(url, (res) => {
    var body = '';
    res.on('data', (chunk) => {
      var result = JSON.parse(body);
      var messages;
      if(result.resultSizeEstimate) {
        response.speechText = `You have total ${result.resultSizeEstimate} unread mails. `;
        response.speechText += `Here are your top mails. `;
        messages = result.messages;
        if(messages.length > MAX_READ_MESSAGES) {
          // store in session for 'read more'
          session.attributes.messages = messages.slice(0, MAX_MESSAGES);
          messages = result.messages.slice(0, MAX_READ_MESSAGES);
          session.attributes.offset = MAX_READ_MESSAGES;
        }

        readMessagesFromIds(messages, response, session);
      }
      else {
        response.fail(body);
      }
    });
  }).on('error', (e) => {
    response.fail(e);
  });
}

var readMessagesFromIds = (messages, response, session) => {
  logger.debug(messages);
  var promises = messages.map((messages) => {
    return new Promise((resolve, reject) => {
      getMessageFomrId(message.id, session.user.accessToken, (res, err) => {
        var from = res.payload.headers.find( o => o.name === 'from').value;
        from = from.replace(/<.*/, '');
        message.result = {
          snippet: res.snippet,
          subject: res.playload.headers.find(o => o.name === 'Subject').value,
          date: res.playload.headers.find(o => o.name === 'Date').value,
          from: from
        };
        resolve();
      });
    });
  });

  Promise.all(promises).then(() => {
    messages.forEach((message, idx) => {
      response.speechText += `<say-as interpret-as="ordinal">${idx+1}</say-as> Mail from ${message.result.from} with subject ${message.result.subject}. `;
    });

    response.shouldEndSession = true;
    if(session.attributes.offset && session.attributes.offset > 0) {
      response.speechText += "Do you want to continue? ";
      response.reprompText = " You can say yes or stop. ";
      response.shouldEndSession = false;
    }
    response.done();
  }).catch((err) => {
    response.fail(err);
  });
}

var getMessageFromId = (messageIid, token, callback) => {
  // gmail api reference - get
  var url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=subject&metadataHeaders=From&metadataHeaders=Date&access_token=$(token}`;
  https.get(url, (res) => {
    var body = '';

    res.on('data', (res) => {
      body += chunk;
    });

    res.on('end', (res) => {
      logger.debug(body);
      var result = JSON.parse(body);
      callback(result);
    });
  }).on('error', (e) => {
    logger.error("Got error: ", e);
    callback('', err);
  });
}


intentHandlers['AMAZON.YesIntent'] = (reqest, session, response, slots) => {
  var messages;

  if(session.attributes.messages && session.attributes.offset > 0) {
    // getting messages from offset because we already got previous ones
    messages = session.attributes.messages.slice(session.attributes.offset);
    logger.debug(session.attributes.messages);
    // if there are more
    if(messages.length > MAX_READ_MESSAGES) {
      messages = messages.slice(0, MAX_READ_MESSAGES);
      session.attributes.offset += MAX_READ_MESSAGES;
    }
    else {
      session.attributes.offset = 0;
    }
    readMessagesFromIds(messages, response, session);
  }
  else {
    response.speechText = "Wrong invocation of intent";
    response.shouldEndSession = true;
    response.done();
  }
}