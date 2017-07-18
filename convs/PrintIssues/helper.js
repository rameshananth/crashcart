var builder=require('botbuilder');
var lib=new builder.Library('PrintIssues');
const logger=require('../../lib/core/logger/helper.js');
var logThis=logger.logThis;


/*
Global definitions
*/

const sGreeting="Hi! I am sorry that you are unable to print. Can we start the triage process?";
/*
Dialog definitions
*/
var gjGetIncident={
	name:"MSBotFramework:/CheckPrereqs",
	parameters:{
		check:{
			name:"MSBotFramework:/GetText",
			parameters:{message:"Please describe your problem"}
		},
		success:{
			name:"",
			parameters:{message:null}
		},
		failure:{
			name:"",
			parameters:{message:null}
		}
	}
};


var gjNewTicketConv={
	name:"MSBotFramework:/CheckPrereqs",
	parameters:{
		check:{
			name:"MSBotFramework:/GetConfirm",
			parameters:{
				message:"Umm.. You don't seem to have any tickets. Do you want to open a new one?"
			}
		},
		success:{
			name:gjGetIncident.name,
			parameters:gjGetIncident.parameters
		},
		failure:{
			name:"",
			parameters:{message:null}
		}
	}		
};

var gjGetAndDisplayOneTicket={
	name:"MSBotFramework:/CheckPrereqs",
	parameters:{
		check:{
			name:"ServiceNow:/GetTicket",
			parameters:{
				message:null,
				persistResponse:true,
				persistVariable:'Tickets'
			}
		},
		success:{
			name:"ServiceNow:/MakeIncidents",
			parameters:{message:null}
		},
		failure:{
			name:gjNewTicketConv.name,
			parameters:gjNewTicketConv.parameters
		}
	}
};

var gjGetAndDisplayAllTickets={
	name:"MSBotFramework:/CheckPrereqs",
	parameters:{
		check:{
			name:"ServiceNow:/GetTickets",
			parameters:{
				message:null,
				persistResponse:true,
				persistVariable:'Tickets'
			}
		},
		success:{
			name:"ServiceNow:/MakeIncidents",
			parameters:{message:null}
		},
		failure:{
			name:gjNewTicketConv.name,
			parameters:gjNewTicketConv.parameters
		}
	}
};

var gjPromptUserForTicketNumber={
name:"MSBotFramework:/CheckPrereqs",
parameters:{
	check:{ 
		name: "MSBotFramework:/GetConfirm",
	        parameters:{ message:
			    "Do you have the ticket number handy? It should start with a INC, SRQ or CHG and be followed by a 7 digit number"
			   }
	      },
	 success:{
		 name: "MSBotFramework:/CheckPrereqs",
		 parameters:{
		 		check:{ name:"MSBotFramework:/GetText",
			 		parameters:{ 
				 		message:"Great. Can you enter the ticket number?",
						persistResponse:true,
				 		persistVariable:'Ticket'
			 		}
		 		},
		 		success:{
			 		name:gjGetAndDisplayOneTicket.name,
			 		parameters:gjGetAndDisplayOneTicket.parameters
	 	 		},
		 		failure:{
		 			name:"",
		 			parameters:{message:null}
		 		}
		 }
	},
	failure:{
		name:gjGetAndDisplayAllTickets.name,
		parameters:gjGetAndDisplayAllTickets.parameters
	}
}
};

var gjGetTicketStatusConv={
	name:"MSBotFramework:/CheckPrereqs",
	parameters:{
		check:{
			name:"MSBotFramework:/GetEntity",
			parameters:{
				entityName: 'ServiceDesk.TicketType',
				persistResponse:true,
				persistVariable:'Ticket'
			}
		},
		success:{
			name:gjGetAndDisplayOneTicket.name,
			parameters:gjGetAndDisplayOneTicket.parameters
		},
		failure:{
			name:gjPromptUserForTicketNumber.name,
			parameters:gjPromptUserForTicketNumber.parameters
		}
	}
};

var gjCheckIfTriageOK={
	name:"MSBotFramework:/GetConfirm",
	parameters:{
		message:sGreeting
	}
};

var gjGetUsersMachineName={
	name:"MSBotFramework:/GetText",
	parameters:{
		message:"Please enter the name of the laptop/desktop from which you are attempting to print"
	}
};



var gjStartTriage={
	name:"MSBotFramework:/CheckPrereqs",
	parameters:{
		check:{
			name:gjCheckIfTriageOK.name,
			parameters:gjCheckIfTriageOK.parameters
		},
		success:{
			name:gjGetUsersMachineName.name,
			parameters:gjGetUsersMachineName.parameters
		},
		failure:{
			name:gjNewTicketConv.name,
			parameters:gjNewTicketConv.parameters
		}
	}
};

//If you have an Update request
var _mapping=[
	{
	 	intentName: 'ServiceDesk.PrintIssue',
		dialogName: '/AcknowledgePrintIssue',
		entryPoint:gjGreet
	}
];

/*
lib.dialog('/Greet',[
function(session,args,next){
	logThis("Debug:In the ServiceDesk.Greet dialog");
	logThis(session.message.address);
	session.endConversation(sGreeting);
	//session.send("OK. Calling the service desk...");
	//startProactiveDialog(endUser);
}
]).triggerAction({matches:'ServiceDesk.Greet'});
*/

/************************************************************************************************************************************
Boiler plate code to dynamically make a library. Do not modify. 
1. _funcs needs to be in the scope of the library otherwise it doesn't get called
2. The entrypoint needs to be bound through a closure
*************************************************************************************************************************************/
var _funcs;
function makeWaterFall(dialogName,entryPoint,intentName){
	return [
		function(session,args,next){
			//logThis("Hi");
			//logThis(session);
			console.log(session.message.address.conversation.id+",Entering:"+dialogName+",TriggeredBy:"+intentName);
			//Save the global intent to the conversation data
			session.conversationData.intent=args.intent;
			session.beginDialog(entryPoint.name,entryPoint.parameters);
		},
		function(session,results){
			logThis("Ending "+dialogName+" dialog");
			session.endConversation();
		}
		];
}

for(i=0;i<_mapping.length;i++){
	_funcs=makeWaterFall(lib.name+":"+_mapping[i].dialogName,_mapping[i].entryPoint,_mapping[i].intentName);
	lib.dialog(_mapping[i].dialogName,_funcs).triggerAction({matches: _mapping[i].intentName});
}

module.exports.createLibrary = function () {
    return lib.clone();
};
/************************************************************************************************************************************
**************************************                           End of block   ******************************************************
*************************************************************************************************************************************/




