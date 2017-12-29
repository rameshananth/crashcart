var builder=require('botbuilder');
var lib=new builder.Library('MSBotFramework');
const util=require('util');
const debug=1;
var aqlquery=require('arangojs').aqlQuery;
var db= require('arangojs')({
				database:"fixit",
				url:"http://13.65.29.182:8529"
			   });
db.useBasicAuth('root','wipro@123');
db.useDatabase('fixit');

function logThis(results){
	if(debug==1){
	console.log(util.inspect(results));
	}
}

lib.dialog('/Intent',[
	function(session,args,next){
		//console.log("Hello. You are in the intent function");
		session.endDialogWithResult({success:true});
	}
]);

lib.dialog('/GetEntity',[
	function(session,args,next){
		/*
		Gets an entity from a list of intent entities persisted in conversationData and returns it
		The entityName is passed on as an argument parameter: entityName
		You can persist this variable by making it part of a checkPrereqs function
		*/
		var eVar=builder.EntityRecognizer.findEntity(session.conversationData.intent.entities, args.entityName);
		if(eVar){
			session.endDialogWithResult({response:eVar.entity,success:true});
		}
		else{
			session.endDialogWithResult({response:null,success:false});
		}
	}	   
]);

lib.dialog('/GetConfirm',[
  function(session,args,next){
    console.log("In the MSBotFramework:/GetConfirm function");
    builder.Prompts.confirm(session,args.message);
  },
  function(session,result){
    console.log('Result returned from MSBotFramework:/GetConfirm function is in variable: response'
                +'Result is:'+result.response
                );
	if(result.response){
		session.endDialogWithResult({response:result.response,resumed:null,success:true});	
	}
	else{
		session.endDialogWithResult({response:result.response,resumed:null,success:false});
	}
    
  }
]);
                

lib.dialog('/GetText',[
  function(session,args,next){
    console.log("In the MSBotFramework:/GetText function");
    //console.log("The return variable is:"+args.returnVariable);
    session.dialogData.returnVariable=args.returnVariable;
    builder.Prompts.text(session,args.message);
  },
  function(session,result){
    var sResult='response.'+session.dialogData.returnVariable;
    console.log('Result returned from MSBotFramework:/GetText function is in variable: response'
                +'Result is:'+result.response
               );
    var map={}
    map['response']=result.response;
    map['resumed']=null;
    map['success']=true;
    session.endDialogWithResult({response:result.response,resumed:null,success:true});
  }
]);


lib.dialog('/CheckPrereqs',[
  function(session,args,next){
    if(args.nodeID){
	    session.conversationData.currentNode=args.nodeID;
    }
    console.log("In the MSBotFramework:/CheckPrereqs function");
    //session.dialogData.args=args;
    //console.log(args);
    args.check={};
    if(args.nodeID){//A node was specified so call the node as a check function
	    var query_str="FOR v,e,p in OUTBOUND '"+args.nodeID+"' GRAPH 'Conversations.ServiceDesk.Update'\n RETURN p";
	    console.log(query_str);
	    db.query(query_str
		).then(cursor=>cursor.all()
		).then(vals=>{
		    console.log(vals);
		    if(vals.length==0){//No paths remaining
			    console.log("End of path");
			    return;
		    }
		    else if(vals.length==1){//Some path remains so let's call the check function
			    console.log(vals);
			    console.log("Vertice 0");
			    console.log(vals[0].vertices[0]);
			    var name=vals[0].vertices[0].library+":/"+vals[0].vertices[0].name;
			    console.log("Check function name:"+name);
			    var parameters=vals[0].vertices[0].parameters;
			    console.log("Check function parameters:"+parameters);
			    //var type=vals[0].edges[0].type;
			    //var to=vals[0].edges[0]._to;
			    //console.log("One edge of type "+type+" leading to"+to);
			    args.check['name']=name;
			    args.check['parameters']=parameters;
			    //args.check[type]=to;
			    console.log(args);
			    session.dialogData.args=args;
			    console.log(session.dialogData);
		    }
		    console.log("Returned from the check function");
		    next();
	    });
	    
    }
    //session.dialogData.args=args;
    //console.log("After settting and before calling the check");
    //console.log(session.dialogData);
  },
  function(session,result){
    logThis("In the cleanup function");
    //logThis(session);
    //Need to requery because promises. Blech!
    var query_str="FOR v,e,p in OUTBOUND '"+session.conversationData.currentNode+"' GRAPH 'Conversations.ServiceDesk.Update'\n RETURN p";
    console.log(query_str);
    db.query(query_str
    ).then(cursor=>cursor.all()
    ).then(vals=>{
	    if(vals.length==0){
	    	if(result.success==true){
		    console.log("Success but end of path");
		    session.endDialogWithResult({response:result.response,success:true});
	    	}
	    	else if(result.success==false){
		    console.log("Success but end of path");
		    session.endDialogWithResult({response:result.response,success:false});
	    	}
	    	else{
		    console.log("Return value is neither true nor false!");
	    	}		        
    	    }
	    else{
		    	//Mega block to save the results of the previous call
		    	var parameters=vals[0].vertices[0].parameters;//Get the parameters of the check function
	    		if('persistResponse' in parameters){
		    		console.log("persistResponse exists");
		    		if('persistVariable' in args.check.parameters){
		    			console.log("persistVariable exists");
					if(typeof args.check.parameters.persistVariable!=undefined){
						var sVname=args.check.parameters.persistVariable;
			    			console.log("persistVariable refers to "+sVname);
			    			console.log("persisting the response "+result.response+" to session.conversationData."+sVname);
			    			session.conversationData[sVname]=result.response;
			    			logThis(session.conversationData);
					}
					else{
			    			console.log("persistVariable is undefined");
		    			}
		    		}
		    		else{
		    			console.log("persistVariable is missing");
	    	    		}
	    		}
	    		else{
	    			console.log("persistResponse is missing");
    	   		}
		    	
		    	//And then the call to the next piece of the conversation
		    	for(int i=0;i<vals[0].edges.length;i++){
		   		var edge=vals[0].edges[i];
		   		if(result.success==edge){
			   		console.log("The return value of the function is "+result.success+" so calling the "+edge.type+" edge to "+edge._to+" node");
			   		var parameters={'nodeID':edge._to};
			   		session.beginDialog("MSBotFramework:/CheckPrereqs",parameters);
		   		}
	   		}
	    }
    });
 }
]);

module.exports.createLibrary = function () {
    return lib.clone();
};

 /*
    session.beginDialog(args.check.name,args.check.parameters);
			    if('persistResponse' in args.check.parameters){
	    			console.log("persistResponse exists");
	    			if('persistVariable' in args.check.parameters){
		    			console.log("persistVariable exists");
		    			if(typeof args.check.parameters.persistVariable!=undefined){
			    			var sVname=args.check.parameters.persistVariable;
			    			console.log("persistVariable refers to "+sVname);
			    			console.log("persisting the response "+result.response+" to session.conversationData."+sVname);
			    			session.conversationData[sVname]=result.response;
			    			logThis(session.conversationData);
		    			}
		    			else{
			    			console.log("persistVariable is undefined");
		    			}
        		
	   			}
	    		 	else{
		    			console.log("persistVariable is missing");
	    			}
    			   }
			   else{
	    			console.log("persistResponse is missing");
    			   }
   
   if(result.success==true){
      console.log("The Check function returned success");
      if(!session.dialogData.args.success.name){
        console.log("But no success function was defined, so returning with results");
        
      }
      else{
        console.log("Invoking the success function");
        session.beginDialog(session.dialogData.args.success.name,session.dialogData.args.success.parameters);
      }
    }
    else{
      console.log("The Check function returned failure");
      if(!session.dialogData.args.failure.name){
        console.log("But no failure function was defined, so returning with results");
        session.endDialogWithResult({response:result.response,success:false});
      }
      else{
        console.log("Invoking the failure function");
        session.beginDialog(session.dialogData.args.failure.name,session.dialogData.args.failure.parameters);
      }
    }

    
    */
