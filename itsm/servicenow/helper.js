var builder=require('botbuilder');
var serviceNow = require("service-now");
var snow=require('servicenow');
var util=require('util');

console.log(process.env.ITSM_ENDPOINT,process.env.ITSM_ACCOUNT,process.env.ITSM_PASSWORD);

var lib=new builder.Library('ServiceNow');
lib.dialog('/GetTickets',[
	function(session,args,next){
		console.log(session.message.address.conversation.id+",Entering:ServiceNow:/GetTickets");
		var uName=session.message.address.user.name;
		var Snow=new serviceNow(process.env.ITSM_ENDPOINT,process.env.ITSM_ACCOUNT,process.env.ITSM_PASSWORD);
		//console.log(Snow);
		var tickets;
		var arName=session.message.address.user.name.split(' ');
		Snow.getRecords(
			{table:'incident',query:{'caller_id.first_name':'Abel',
					 'caller_id.last_name':'Tuter'
					}
			},
			function (err,data){
 				tickets=data;
				session.endDialogWithResult({'response':tickets,'success':true});
			}
		);
	}
]);

lib.dialog('/GetTicket',[
		function(session,args,next){
			/*
			TODO: 
			1. Need to rewrite this function so that the function evals the args and gets the number from the args.
			right now implicitly picks it up from session.conversationData
			Looks up a ticketnumber available in session.conversationData.Ticket
			Remember to endConversation at the handler function
			*/
			console.log(session.message.address.conversation.id+",Entering:ServiceNow:/GetTicket");
			//console.log(args);
			//console.log("Finding ticket:"+args.ticket_number);
			var uName=session.message.address.user.name;
			var Snow=new serviceNow(process.env.ITSM_ENDPOINT,process.env.ITSM_ACCOUNT,process.env.ITSM_PASSWORD);
			var tickets;
			
			var number=session.conversationData.Ticket;
			/*
			if(args.type=='entity'){
				number=args.ticket_number.entity;
			}
			else{
				number=args.ticket_number;
			}
			*/
			//var arName=session.message.address.user.name.split(' ');
			Snow.getRecords(
			{table:'incident',query:{'number':number}},
			function (err,data){
 				tickets=data;
				session.endDialogWithResult({response:tickets,success:true});
			}
		);
	}
]);

lib.dialog('/MakeIncidents',[
	function(session,args,next){
		/*
		Returns a set of hero cards at session.conversationData.TicketCards
		picks up the Tickets from session.conversationData.Tickets
		*/
		console.log(session.message.address.conversation.id+",Entering:ServiceNow:/MakeIncidents");
		var tickets;
		if('Tickets' in session.conversationData){
			tickets=session.conversationData.Tickets;
		}
		var msg=new builder.Message(session);
		var aCards=[];
		msg.attachmentLayout(builder.AttachmentLayout.carousel);
		for(var i=0;i<session.conversationData.Tickets.length;i++){
			var ticket=tickets[i];
			var url=process.env.ITSM_ENDPOINT+"sp?sys_id="+ticket.sys_id+"&view=sp&id=ticket&table=incident"
			msg.addAttachment({
				contentType: "application/vnd.microsoft.card.adaptive",
				content: { 
					type: "AdaptiveCard",
					body:[
						{
							"type":"TextBlock",
							"text":ticket.number,
							"size":"larger",
							"weight":"bolder"
						},
						{
							"type":"TextBlock",
							"text":ticket.short_description,
							"size":"smaller"	
						},
						{
							"type":"TextBlock",
							"text":"Status:"+ticket.state
						},
						{
							"type":"TextBlock",
							"size":"smaller",
							"text":ticket.category
						}
					],
					actions:[{
						"type": "Action.Http",
						"method": "GET",
						"url": url,
						"title": "View ticket"
					}]		  
				}
			});
			/*
			var card=new builder.HeroCard(session).title(ticket.number+" "+ticket.short_description+" "+ticket.category)
							      .subtitle(ticket.state);
			*/
			//aCards[i]=card;					      
		}
		//msg.attachments(aCards);
		session.send(msg);
		session.endDialogWithResult({response:msg,success:true});
	}	
]);
					     
lib.dialog('/CreateIncident',[
	function(session,args,next){
		console.log(session.message.address.conversation.id+",Entering:ServiceNow:/CreateIncident");
		//var short_description=session.conversationData.IncidentDescription;
		console.log("The issue to raise ticket is for: " + session.conversationData.short_description);
		var config = {
				    instance: "https://wiprodemo4.service-now.com",
				    username: "admin",
				    password: "LWP@2015"
				};
		var iSnow =  new snow.Client(config);
		var o = { 	
			    "short_description": short_description,
			    "description": short_description,
			    "urgency": "1",
			    "severity": "1",
			    "impact": "1"
	     		}
		iSnow.insert("incident",o,function(error,result) {
  //console.log(result);
		var response = result.records;
		console.log(response[0].number +" " + response[0].priority);
		session.send("Created an incident with incident number: "+response[0].number);
		session.endDialogWithResult({incidentNumber:response[0].number});
 		 if(!error) {
			 session.send("Seems like a technical glitch, Unable to create a ticket for you, can you call 911");
    // result cosession.send("Created an incident with incident number: "+response[0].number);ntains array of inserted objets
  		}
		
			
		});
		//Snow.setTable('incident');
	}
		//Snow.
]);
		
module.exports.createLibrary = function () {
    return lib.clone();
};
