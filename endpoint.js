"use strict";
/*
 Endpoint file controls access to video endpoint. Is compatible with CE9.7 and above.
 */
const WebSocket = require('ws');
const EventEmitter = require('events');
const XAPI = require('jsxapi/lib/xapi').default;
const WSBackend = require('jsxapi/lib/backend/ws').default;


module.exports = class TPXapi extends EventEmitter{

    constructor(endpoint) {

        super();

        this.xapi;

        this.url = `ws://${endpoint.ipAddress}/ws`;

        this.endpoint = endpoint;

        this.connectedStatus = 'false';

        this.callID = 'unknown';

        this.callStatus = 'false';

        this.CONTENT_TYPE = "Content-Type: application/json";
        this.ACCEPT_TYPE = "Accept:application/json";
        this.SERVICENOW_AUTHTOKEN = "Authorization: Basic " + process.env.SERVICENOW_USERNAMEPWD_BASE64;
        this.MONITORING_URL = 'https://' + process.env.SERVICE_NOW_INSTANCE_URL + '/api/now/v1/table/incident';

        this.systemInfo = {
            softwareVersion : ''
            , systemName : ''
            , softwareReleaseDate : ''
        };


        this.init();

    }
    //Intialize connection and perform intial endpoint checks for state.
    async init() {
        try {
            await this.connect();
            await this.onReady();

        }catch(e){
            console.log(e)
        }
    };

   async connect() {
        const auth = Buffer.from(`${this.endpoint.username}:${this.endpoint.password}`).toString('base64');
        const options = {
            headers: {
                'Authorization': `Basic ${auth}`,
            }
        };
        const websocket = new WebSocket(this.url, options);
        websocket.on('error', console.error);
        return this.xapi = new XAPI(new WSBackend(websocket));
    };

    async onReady() {
        try{
            this.xapi.on('ready', () => {
                console.log(`connexion successful for ${this.endpoint.ipAddress || this.endpoint.url}`);
                this.connectedStatus = 'true';
                this.checkCallStatus();
                this.checkPeopleCount();
                this.checkPeoplePresence();
                this.checkDnD();
                this.getSysData();
                this.monitorCallStatus();
                this.monitorPeopleStatus();
                this.monitorPeoplePresence();
                this.monitorDnDStatus();
                this.monitorWidget();
                this.reportTouchUiForm();
                return this;
            });
        }catch(e){
            console.error(e)
        }
    };

    async closeConnect() {
        this.connectedStatus = 'false';
        await this.xapi.close();
        return console.log(`connexion closed for ${this.endpoint.ipAddress || this.endpoint.url}`);
    };

    async checkCallStatus() {
        let data = await this.xapi.status.get('Call');
        console.log(data);
        if (data.length === 0) {
            this.callStatus = 'false';
            return this.emit('status', {state: 'disconnected'});
        } else {
            this.callID = data[0].id;
            this.callStatus = 'true';
            console.log(this.callID);
            return this.emit('status', {state: 'call'});
        }
    }
    //if in a call set callID for possible FECC
    monitorCallStatus() {

        this.xapi.status.on('Call', (data) => {

            if (data.ghost === "True") return;

            console.log("call" + JSON.stringify(data));
            this.callID = data.id;
            this.callStatus = 'true';
            console.log(this.callID);
            return this.emit('status', {state: 'call'});
        })
        this.xapi.event.on('CallDisconnect', (data) => {
            console.log("disconnected" + JSON.stringify(data));
            this.callID = 'unknown';
            this.callStatus = 'false';
            console.log(this.callStatus);
            return this.emit('status', {state: 'disconnected'});
        })
    }

    async checkPeopleCount() {
        let data = await this.xapi.status.get('RoomAnalytics PeopleCount');
        console.log(data);
        return this.emit('status', {state: 'people', count: data.Current});
    }

    monitorPeopleStatus() {
        this.xapi.status.on('RoomAnalytics PeopleCount', (data) => {
            console.log(data);
            return this.emit('status', {state: 'people', count: data.Current});
        });

    }
    async checkPeoplePresence(){
        let data = await this.xapi.status.get('RoomAnalytics PeoplePresence');
        console.log(data);
        return this.emit('status', {state: 'peoplePresence', presence: data});
    }

    monitorPeoplePresence() {
        this.xapi.status.on('RoomAnalytics PeoplePresence', (data) => {
            console.log(data);
            return this.emit('status', {state: 'peoplePresence', presence: data});
        })
    }
    async checkDnD(){
        let data = await this.xapi.status.get('Conference DoNotDisturb');
        console.log(data);
        return this.emit('status', {state: 'dnd', status: data});

    }
    monitorDnDStatus() {
        this.xapi.status.on('Conference DoNotDisturb', (data) => {
            console.log(data);
            return this.emit('status', {state: 'dnd', status: data});
        })
    }
    monitorWidget() {
        const handlers = {
            office() { return this.emit('status', {state: 'lights', status: event.Value}) },
            report() { console.log('report generated'); },
        };


        this.xapi.event.on('UserInterface Extensions Widget Action', (event) => {
            const msg = `id=${event.WidgetId} / type=${event.Type} / value=${event.Value}`;
            console.log(msg);

            if (event.WidgetId in handlers) {
                handlers[event.WidgetId](event);
            }
        })

    }

    async getServiceNowIncidentIdFromURL(url) {
        return await this.xapi.command('HttpClient Get', {
            'Header': [this.CONTENT_TYPE, this.SERVICENOW_AUTHTOKEN],
            'Url': url,
            'AllowInsecureHTTPS': 'True'
        });
    }

    async raiseTicket(message) {
        try{
            console.log('Message sendMonitoringUpdatePost: ' + message);
            let history = await this.callHistory();
            var messagecontent = {
                description: "Version :" + this.systemInfo.softwareVersion + "\n Last Call: " + JSON.stringify(history, null, 4),
                short_description: this.systemInfo.systemName + ': ' + message,
            };

            const result = await this.xapi.command('HttpClient Post', {
                'Header': [this.CONTENT_TYPE, this.SERVICENOW_AUTHTOKEN],
                'Url': this.MONITORING_URL,
                'AllowInsecureHTTPS': 'True'
            }, JSON.stringify(messagecontent));

            const serviceNowIncidentLocation = result.Headers.find(x => x.Key === 'Location');

            var serviceNowIncidentURL = serviceNowIncidentLocation.Value;
            var serviceNowIncidentTicket;

            const incidentREsult = await this.getServiceNowIncidentIdFromURL(serviceNowIncidentURL);
            var body = incidentREsult.Body;
            console.log('Got this from getServiceNowIncidentIdFromURL: ' + JSON.stringify(incidentREsult, null, 4));
            serviceNowIncidentTicket = JSON.parse(body).result.number;
            const finalPanel = await this.xapi.command("UserInterface Message Alert Display", {
                Title: 'ServiceNow receipt'
                , Text: 'Your ticket id is ' + serviceNowIncidentTicket + '. Thanks for you feedback! Have an awesome day!'
                , Duration: 10
            });
            return console.log(finalPanel);
        }catch(e){
            console.error(e);
            this.xapi.command("UserInterface Message Alert Display", {
                Title: 'ServiceNow failure'
                , Text: 'Please call the help desk to report your issue'
                , Duration: 10
            });
        }

    }

    async getSysData() {
        try{
            this.systemInfo.softwareVersion = await this.xapi.status.get('SystemUnit Software Version');

            this.systemInfo.systemName = await this.xapi.config.get('SystemUnit Name');

            if (this.systemInfo.systemName === '') {
                this.systemInfo.systemName = await this.xapi.status.get('SystemUnit Hardware Module SerialNumber')
            }

            this.systemInfo.softwareReleaseDate = await this.xapi.status.get('SystemUnit Software ReleaseDate');

            const clientmode = await this.xapi.config.set('HttpClient Mode', 'On');
            return console.log(clientmode);
        }catch(e){
            console.error(e);
        }
    }

    async callHistory() {
        const history = await this.xapi.command("CallHistory Recents", {Limit: 1, DetailLevel: "Full"});
        console.log(history);
        return history;
    }
    reportTouchUiForm() {
        this.xapi.event.on('UserInterface Extensions Panel Clicked', (event) => {
            if (event.PanelId == 'reportissue') {
                this.xapi.command("UserInterface Message Prompt Display", {
                    Title: "Report issue"
                    , Text: 'Please select what the problem area is'
                    , FeedbackId: 'roomfeedback_step1'
                    , 'Option.1': 'Cleanliness'
                    , 'Option.2': 'Technical issues with Audio/Video'
                    , 'Option.3': 'Other'
                }).catch((error) => {
                    console.error(error);
                });
            }
        });
        this.xapi.event.on('UserInterface Message TextInput Response', (event) => {
            switch (event.FeedbackId) {
                case 'roomfeedback_step2_cleanliness':
                    this.systemInfo.short_description = 'Cleaner issue';
                    this.raiseTicket(this.systemInfo.systemName + ' needs cleaning' + ': ' + event.Text);
                    break;
                case 'roomfeedback_step2_other':
                    this.raiseTicket('There is some issue in ' + this.systemInfo.systemName + ': ' + event.Text);
                    break;
            }
        });
        this.xapi.event.on('UserInterface Message Prompt Response', (event) => {
            console.log(event.OptionId + event.FeedbackId);
            switch (event.FeedbackId) {
                case 'roomfeedback_step1':
                    switch (event.OptionId) {
                        case 1:
                            this.xapi.command("UserInterface Message TextInput Display", {
                                Duration: 0
                                , FeedbackId: "roomfeedback_step2_cleanliness"
                                , InputType: "SingleLine"
                                , KeyboardState: "Open"
                                , Placeholder: "Details on cleanliness issue"
                                , SubmitText: "Submit"
                                , Text: "Please leave optional comment about the cleanliness issue or just hit Submit if its obvious that the room needs cleaning!"
                                , Title: "Cleanliness Details"
                            }).catch((error) => {
                                console.error(error);
                            });
                            break;
                        case 2:
                            this.xapi.command("UserInterface Message Prompt Display", {
                                Title: "A/V Issue reporting"
                                , Text: 'Please select what the problem seems to be'
                                , FeedbackId: 'roomfeedback_step2'
                                , 'Option.1': 'Call did not connect'
                                , 'Option.2': 'Audio was bad'
                                , 'Option.3': 'Video was bad'
                            }).catch((error) => {
                                console.error(error);
                            });
                            break;
                        case 3:
                            this.xapi.command("UserInterface Message TextInput Display", {
                                Duration: 0
                                , FeedbackId: "roomfeedback_step2_other"
                                , InputType: "SingleLine"
                                , KeyboardState: "Open"
                                , Placeholder: "Describe issue here"
                                , SubmitText: "Next"
                                , Text: "Please enter a short description of the issue"
                                , Title: "Issue info"
                            }).catch((error) => {
                                console.error(error);
                            });
                            break;
                    }
                    break;
                case 'roomfeedback_step2':
                    this.systemInfo.short_description = 'AV issue';
                    this.raiseTicket('There is an audio/video issue in ' + this.systemInfo.systemName);
                    break;
                case 'reportissue':
                    switch (event.OptionId) {
                        case 1:
                            this.raiseTicket(this.systemInfo.systemName + ' is having audio or video issues');
                            break;
                        case 2:
                            this.raiseTicket(this.systemInfo.systemName + ' needs cleaning');
                            break;
                        case 3:
                            this.raiseTicket(this.systemInfo.systemName + ' Just has someone complaining for no reason');
                            break;
                    }
                    break;
            }
        });
    }
};


