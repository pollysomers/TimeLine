//This app does not deal with TimeZone differences. If you see odd pixel misalignments, it is probably due to
//you having different people in different timezones doing stuff in the same workspace.


Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    id: 'MyApp',

    inheritableStatics: {
        ErrorColour: 'tomato',
        WarnColour:  'orangered',
        PassColour:  'lightgreen',
        DoneColour:  'silver',
        ToDoColour:  'lightblue',
        HdrColour:   'lightgray',
        DataError:   'red',
        DaysPerMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        TreeBoxWidth: 200,
        TimeLineBarHeight: 30,
        HeaderBoxHeight: 15,
        MileStoneBoxColour: Rally.util.Colors.cyan
    },

    items: [
        {
            xtype: 'container',
            layout: 'hbox',
            items: [
                {
                    xtype: 'container',
                    id: 'headerBox',
                    flex: 1,
                    layout: 'hbox',
                    items: [
                        {
                            xtype: 'rallydatefield',
                            margin: 10,
                            format: 'D d M Y',
                            id: 'StartDate',
                            stateful: true,
                            fieldLabel: 'Start Date',
                            value: Ext.Date.subtract( new Date(), Ext.Date.DAY, 90) // 90 days of previous information
                        },
                        {
                            xtype: 'rallydatefield',
                            margin: 10,
                            fieldLabel: 'End Date',
                            format: 'D d M Y',
                            stateful: true,
                            id: 'EndDate',
                            value: new Date()
                        }
                    ]
                },
                {
                    xtype: 'container',
                    layout: 'hbox',
                    margin: 10,
                    items: [
                        {
                            xtype: 'rallybuttonslider',
                            labelText: 'Zoom',
                            id: 'zoomSlider',
                            stateful: true,
                            value: 10

                        }
                    ]
                }
            ]
        }
    ],

    getSettingsFields: function() {

        var returnVal = [{
                xtype: 'rallycheckboxfield',
                name: 'percentageType',
                fieldLabel: 'Use story points for percentages:',
                stateful: true,
                stateId: 'percent-' + Ext.id(),
                labelAlign: 'right',
                labelWidth: 200

            },{
                xtype: 'rallycheckboxfield',
                name: 'displayIterations',
                fieldLabel: 'Display Iteration Header:',
                stateful: true,
                stateId: 'dispIters-' + Ext.id(),
                labelAlign: 'right',
                labelWidth: 200

            },{
                xtype: 'rallycheckboxfield',
                name: 'displayReleases',
                fieldLabel: 'Display Release Header:',
                stateful: true,
                stateId: 'dispRels-' + Ext.id(),
                labelAlign: 'right',
                labelWidth: 200

            },{
                xtype: 'rallycheckboxfield',
                name: 'updateForRelease',
                fieldLabel: 'Release change updates Dates:',
                stateful: true,
                stateId: 'dduRels-' + Ext.id(),
                labelAlign: 'right',
                labelWidth: 200

            },{
                xtype: 'textarea',
                fieldLabel: 'Query',
                name: 'query',
                anchor: '100%',
                cls: 'query-field',
                margin: '0 70 0 0',
                plugins: [{
                        ptype: 'rallyhelpfield',
                        helpId: 194
                    },
                    'rallyfieldvalidationui'
                ],
                validateOnBlur: false,
                validateOnChange: false,
                validator: function(value) {
                    try {
                        if (value) {
                            Rally.data.wsapi.Filter.fromQueryString(value);
                        }
                        return true;
                    } catch (e) {
                        return e.message;
                    }
                }
            }
        ];

        return returnVal;

    },

    //Define a pixel factor for the zoom
    zoomLevel: 1,

    _resetTreeBox: function(app) {
        var tb = Ext.getCmp('treeBox');
        app._destroyBars(tb.id);

        tb.add( app._createBar({
                title: 'Calendar Month:',
                colour: CustomApp.HdrColour,
                width: '100%',
                margin: '0 0 10 0',
                height: CustomApp.HeaderBoxHeight,
                align: 'right'
            })
        );
    },

    _destroyBars: function(boxTitle) {

        var box = Ext.getCmp(boxTitle);
        if (box) { box.removeAll(); }
    },

     _resizeAllBars: function() {
        this._redrawTimeLines(this, Ext.getCmp('piType').getRecord().get('TypePath'));
    },

    _addTipInfo: function(box, tooltipfields) {

        var record = box.record;

        var html = '';
        _.each(tooltipfields, function(tip) {

            var typeOfField = Object.prototype.toString.call(record.get(tip.field));

            //Reformat dates to a short format
            if ( typeOfField.search('Date')){
                html += '<p>' + tip.text + ': ' + Ext.Date.format(record.get(tip.field), 'D d M Y') + '</p>';
            } else {
                html += '<p>' + tip.text + ': ' + record.get(tip.field) + '</p>';
            }
        });

        return ((html.length>0)? html: null);

    },

    _renderTimeboxes: function() {
        this._iterationRender(); //Do it in this order because of the container arrangement
        this._releaseRender();
    },

    _iterationRender: function() {
        if (!(this.getSetting('displayIterations')))
            return;

        var title = 'Sprint: ';
        var tb = Ext.getCmp('treeBox');
        var titleBox = this._createBar(
        {
            width: '100%',
            height: CustomApp.HeaderBoxHeight,
            title: title,
            colour : CustomApp.HdrColour,
            align: 'right'
        });

        tb.insert(0, titleBox);

        var tipFields = [
            {
                'text' : 'Iteration Start Date',
                'field': 'StartDate'
            },
            {
                'text' : 'Iteration End Date',
                'field': 'EndDate'
            }

        ];

        this._timeboxRender('iteration', 'StartDate', 'EndDate', title, tipFields);
    },

    _releaseRender: function() {
        if (!(this.getSetting('displayReleases'))) 
            return;

        var title = 'Program Increment: ';
        var tb = Ext.getCmp('treeBox');
        var titleBox = this._createBar(
        {
            width: '100%',
            height: CustomApp.HeaderBoxHeight,
            title: title,
            colour : CustomApp.HdrColour,
            align: 'right'
        });

        tb.insert(0, titleBox);

        var tipFields = [
            {
                'text' : 'Release Start Date',
                'field': 'ReleaseStartDate'
            },
            {
                'text' : 'Release End Date',
                'field': 'ReleaseDate'
            }

        ];
        this._timeboxRender('release', 'ReleaseStartDate', 'ReleaseDate', title, tipFields);
    },

    _timeboxRender: function(model, startdatefield, enddatefield, title, tooltipfields) {

        var app = this;

        var dataStore = Ext.create('Rally.data.wsapi.Store', {
            model: model,
            autoLoad: true,
            context: {
                project: Rally.environment.getContext().getProjectRef(),
                projectScopeUp: false,
                projectScopeDown: false
            },
            sorters: [{
                property: enddatefield,
                direction: 'ASC'
            }],
            listeners: {
                load: function(store, data, success) {
                    //Create a list of items removing gaps between timboxes (shouldn't be any apart from the day of handover)

                    var timeBox = Ext.getCmp(model + 'Box');
                    var boxes = [];

                    //If the first release starts after the time period, we need a blank at the start...
                    var srd = data[0].get(startdatefield);
                    if ( srd > stats.start){
                        var startBox = {
                            'width': (Ext.Date.getElapsed( srd, stats.start)* stats.pixelsPerDay)/(24 * 3600 * 1000),
                            'start': stats.start,
                            'leftMargin': 0,
                            'end': srd,
                            'colour': CustomApp.ToDoColour,
                            'height': CustomApp.HeaderBoxHeight
                        };
                        boxes.push(startBox);
                    }
                    _.each(data, function(tb) {

                        var thisStart = Ext.Date.clearTime(tb.get(startdatefield));
                        var thisEnd = Ext.Date.clearTime(Ext.Date.add(tb.get(enddatefield), Ext.Date.HOUR, 1)); //Takes you up to the end of the day

                        if ((lastBox = boxes[boxes.length-1])) {
                            //Check the date of the last one and if needed, add a spacer
                            if (lastBox.end != thisStart) {
                                var spacerBox = {
                                    'width': (Ext.Date.getElapsed( lastBox.end, thisStart)* stats.pixelsPerDay)/(24 * 3600 * 1000),
                                    'start': lastBox.end,
                                    'leftMargin': 0,
                                    'end': thisStart,
                                    'colour': CustomApp.ToDoColour,
                                    'height': CustomApp.HeaderBoxHeight
                                };
                                boxes.push(spacerBox);
                            }
                        }
                        var box = {
                            'width': (Ext.Date.getElapsed( thisEnd, thisStart)* stats.pixelsPerDay)/(24 * 3600 * 1000),
                            'leftMargin': 0,
                            'start': thisStart,
                            'end': thisEnd,
                            'colour': CustomApp.HdrColour,
                            'title': tb.get('Name'),
                            'height': CustomApp.HeaderBoxHeight,
                            'record': tb
                        };
                        box.tooltip = app._addTipInfo(box, tooltipfields);
                        boxes.push(box);
                    });

                    //If the last release end before the time period, we need a blank at the end...
                    var erd = boxes[boxes.length-1].end;
                    if ( erd < stats.end){
                        var endBox = {
                            'width': (Ext.Date.getElapsed( erd, stats.end)* stats.pixelsPerDay)/(24 * 3600 * 1000),
                            'start': erd,
                            'leftMargin': 0,
                            'end': stats.end,
                            'colour': CustomApp.ToDoColour,
                            'height': CustomApp.HeaderBoxHeight
                        };
                        boxes.push(endBox);
                    }

                    //Now truncate the list of boxes depending on the display time

                    _.each(boxes, function(box) {
                        if (!((box.end < stats.start) || (box.start > stats.end))) {    //Somewhere in view
                            if (box.start < stats.start) {
                                box.start = stats.start;
                                if (box.start >= box.end) {
                                    box.width = 0;
                                } else {
                                    box.width = (Ext.Date.getElapsed( box.end, box.start)* stats.pixelsPerDay)/(24 * 3600 * 1000);
                                }
                            }
                            if (box.end > stats.end) {
                                box.end = stats.end;
                                if ( box.end <= box.start) {
                                    box.width = 0;
                                } else {
                                    box.width = (Ext.Date.getElapsed( box.end, box.start)* stats.pixelsPerDay)/(24 * 3600 * 1000);
                                }
                            }

                            var theBar = app._createBar(box);
                            theBar.addCls('mnthBox');
                            theBar.addCls('tltBox');
                            timeBox.add(theBar);
                        }
                    });
                }
            }
        });
    },

    launch: function() {

        var app = this;

        // Get the zoom slider and  add some handlers
        var slider = Ext.getCmp('zoomSlider');
        var lb = slider.getLeftButton();
        var rb = slider.getRightButton();
        var sl = slider.getSlider();

        rb.on('click', function() {
            app.zoomLevel += 1;
            if (app.zoomLevel > 10) { app.zoomLevel = 10; }
            sl.setValue( app.zoomLevel * 10 );
            app._redrawTimeLines(app, Ext.getCmp('piType').getRecord().get('TypePath'));
        });

        lb.on('click', function() {
            app.zoomLevel -= 1;
            if (app.zoomLevel <= 0) { app.zoomLevel = 1; }
            sl.setValue( app.zoomLevel * 10 );
            app._redrawTimeLines(app, Ext.getCmp('piType').getRecord().get('TypePath'));

        });

        sl.on('changecomplete', function( slider, value, that) {
            app.zoomLevel = Math.trunc(value/10);
            app._redrawTimeLines(app, Ext.getCmp('piType').getRecord().get('TypePath'));
        });

        // Add handlers for date changes

        Ext.getCmp('StartDate').on('select', app._resizeAllBars, app);
        Ext.getCmp('EndDate').on('select', app._resizeAllBars, app);

        //Define a box to the left for the item tree and a box to the right that has the lines in


        var timeLineBox = Ext.create('Ext.container.Container', {
                layout: 'hbox',
                items: [
                    {
                        xtype: 'container',
                        id: 'treeBox',
                        width: this.self.TreeBoxWidth - 4, //Margin
                        margin: '0 0 0 0', //Space for milestone box, if needed
                        autoScroll: false
                    },
                    {
                        xtype: 'container',
                        id: 'scrollBox',
                        layout: 'vbox',
                        items: [
                            {
                                xtype: 'container',
                                id: 'releaseBox',
                                layout: 'hbox'
                            },
                            {
                                xtype: 'container',
                                id: 'iterationBox',
                                layout: 'hbox'
                            },
                            {
                                xtype: 'container',
                                id: 'monthBox',
                                layout: 'hbox'
                            },
                            {
                                xtype: 'container',
                                autoSize: true,
                                id: 'lineBox'
                            }
                        ],
                        flex: 1,
                        autoScroll: true
                    }
                ]
        });

        this.add(timeLineBox);

        //Whilst that is happening, fetch the roots (not tree!)

        //TODO

        var pitype = Ext.getCmp('piType');

        if ( !(pitype)){
            pitype = Ext.create('Rally.ui.combobox.PortfolioItemTypeComboBox',
                        {
                            margin: 10,
                            id: 'piType',
                            listeners: {
                                select: function() { app._redrawTimeLines(app, Ext.getCmp('piType').getRecord().get('TypePath')); }
                            }
                        });
        }

        Ext.getCmp('headerBox').insert(0, pitype);

    },

    onTimeBoxScopeChange: function(newScope) {
        this._redrawTimeLines(this, Ext.getCmp('piType').getRecord().get('TypePath'));
        if (this.getSetting('updateForRelease')){
            //Give the user the option to change the start/edn dates to match

            Ext.create('Rally.ui.dialog.ConfirmDialog', {
                message: 'Update dates to match Release?',
                confirmLabel: 'Ok',
                listeners: {
                    confirm: function(){
                        debugger;
                    }
                }
            });
        }
    },

    // Modify the title box popup if the data is invalid
    _dataCheckItem: function(app, box, item) {

    },

    _addToday: function(app) {
        var msbox = Ext.getCmp('milestoneBox');
        var linebox = Ext.getCmp('lineBox');

        //Create a thing to add to month box

        var margin = '0 0 0 ' + ((Ext.Date.getElapsed( stats.start, new Date())* stats.pixelsPerDay)/(24 * 3600 * 1000) - 4);
        todayIcon = Ext.create('Ext.container.Container', {
            height: '10px',
            width: '10px',
            style: {
                backgroundColor: CustomApp.MileStoneBoxColour
            },
            margin: margin,
            listeners: {
                afterrender: function() {
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target : this.getEl(),
                        html: 'Today: ' + Ext.Date.format(new Date(), 'D, d M Y')
                    });
                }
            }
        });

        todayIcon.addCls('todayIcon');
        msbox.add(todayIcon);

        //Create a thing to add to lineBox
        todayLine = Ext.create('Ext.container.Container', {
            height: linebox.getHeight(),
            width: '1px',
            border: 1,
            style: {
                borderColor: '#000000',
                borderStyle: 'solid',
                backgroundColor: '#000000'
            },
            margin: '0 0 0 ' + (Ext.Date.getElapsed( stats.start, new Date())* stats.pixelsPerDay)/(24 * 3600 * 1000)
        });

        todayLine.addCls('todayLine');
        msbox.add(todayLine);
    },

    _redrawTimeLines: function(app, type ) {

        var filters = [];
        var timeboxScope = app.getContext().getTimeboxScope();
        if(timeboxScope) {
            filters.push(timeboxScope.getQueryFilter());
        }

        //Now get the settings query box and apply those settings
        var queryString = app.getSetting('query');
        if (queryString) {
            var filterObj = Rally.data.wsapi.Filter.fromQueryString(queryString);
            filterObj.itemId = filterObj.toString();
            filters.push(filterObj);
        }

        var itemStore = Ext.create('Rally.data.wsapi.Store', {
            model: type,
            autoLoad: true,
            filters: filters,
            sorters: [{
                property: 'rank',
                direction: 'ASC'
            }],
            listeners: {
                load: function(store, data, success) {

                    app._destroyBars('lineBox');
                    app._destroyBars('releaseBox');
                    app._destroyBars('iterationBox');
                    app._destroyBars('monthBox');
                    app._resetTreeBox(app);

                    app._calcTimeStats();

                    app._drawMonthBars();
                    app._renderTimeboxes();
                    app._addMilestoneBox(app);

                    var timeLineBox = Ext.getCmp('lineBox');
                    var treeBox = Ext.getCmp('treeBox');

                    _.each(data, function(item) {

                        tlbox = app._createTimeLineForItem(app, item);
                        timeLineBox.add(tlbox);

                        ttbox = app._createTitleBoxForItem(app, item);
                        app._dataCheckItem(app, ttbox, item);
                        treeBox.add(ttbox);

                    });
                    app._addToday(app);
                }
            }
        });
    },

    _createTitleBoxForItem: function(app, item) {
        var titleRec = {};
        titleRec.colour = CustomApp.HdrColour;
        titleRec.leftMargin = 0;
        titleRec.width = '100%';
        titleRec.title = item.get('FormattedID') + ': ' + item.get('Name');
        var box = app._createBar(titleRec);
        box.addCls('tltBox');

        return box;
    },

    _createTimeLineForItem: function(app, item) {

        var today = new Date(); // Seize the day...

        //We are creating two bars within the space of one, so reduce the height
        //Create a container to hold the bars first

        var box = Ext.create('Ext.container.Container', {
            id: 'timeLineBox-' + item.get('FormattedID')
        });

        box.addCls('tlBox');
        box.height = CustomApp.TimeLineBarHeight;

        // Create bar for PlannedStart and PlannedEnd. TODO: store these records for later manipulation
        var pRecord = {};
        pRecord.colour = CustomApp.HdrColour;
        pRecord.width = 0;
        pRecord.height = Math.floor(CustomApp.TimeLineBarHeight/2);
        pRecord.leftMargin = 0;

        var plannedStart = null;
        var plannedEnd = null;
        var startBetween = null;
        var endBetween = null;

        //Are there incomplete data
        if (!(item.get('PlannedStartDate') && item.get('PlannedEndDate'))) {
            pRecord.colour = CustomApp.DataError;
        } else {
            plannedStart = new Date(item.get('PlannedStartDate'));
            plannedEnd = new Date(item.get('PlannedEndDate'));

            startBetween = Ext.Date.between( plannedStart, stats.start, stats.end);
            endBetween = Ext.Date.between( plannedEnd, stats.start, stats.end);

            //If there is no start date in the item, the timeline will go back forever!

            if ( !startBetween && endBetween ){
                pRecord.leftMargin = 0;
                pRecord.width = (Ext.Date.getElapsed( stats.start, plannedEnd)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            }

            //If there is no end date in the item, the timeline will go on forever!

            else if ( startBetween && !endBetween ) {
                pRecord.leftMargin = (Ext.Date.getElapsed( stats.start, plannedStart)* stats.pixelsPerDay)/(24 * 3600 * 1000);
                pRecord.width = (Ext.Date.getElapsed( plannedStart, stats.end)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            }

            else if ( startBetween && endBetween) {
                pRecord.leftMargin = (Ext.Date.getElapsed( stats.start, plannedStart)* stats.pixelsPerDay)/(24 * 3600 * 1000);
                pRecord.width = (Ext.Date.getElapsed( plannedStart, plannedEnd)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            }
        }
        var plannedBar = app._createBar(pRecord);
        plannedBar.addCls('planBar');

        var tipFields = [
            {
                'text' : 'Planned Start Date',
                'field': 'PlannedStartDate'
            },
            {
                'text' : 'Planned End Date',
                'field': 'PlannedEndDate'
            }

        ];


        plannedBar.record = item;
        plannedBar.tooltip = app._addTipInfo(plannedBar, tipFields);

        box.add(plannedBar);

        // Create bar for ActualStart and ActualEnd
        var aRecord = {};
        var percentComplete = 0;

        if ( app.getSetting('percentageType')) {
            percentComplete = Math.floor(item.get('PercentDoneByStoryPlanEstimate') * 100);
        } else {
            percentComplete = Math.floor(item.get('PercentDoneByStoryCount') * 100);
        }
        aRecord.colour = CustomApp.PassColour;
        aRecord.height = Math.floor(CustomApp.TimeLineBarHeight/2);
        aRecord.leftMargin = 0;
        aRecord.width = 0;

        var actualStart = new Date(item.get('ActualStartDate'));
        var actualEnd = new Date(item.get('ActualEndDate'));

        //Let's see what colour it should be

        if ((item.get('ActualStartDate') && item.get('ActualEndDate'))) {
            aRecord.colour = CustomApp.DoneColour;
            aRecord.title = percentComplete + '%';
            aRecord.leftMargin = (Ext.Date.getElapsed( stats.start, actualStart)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            aRecord.width = (Ext.Date.getElapsed( actualStart, actualEnd)* stats.pixelsPerDay)/(24 * 3600 * 1000);

        } else {

            if (item.get('ActualStartDate')) {
                aRecord.title = percentComplete + '%';
                colourStart = item.get('ActualStartDate');
            } else if (item.get('PlannedEndDate')) {
                colourStart = item.get('PlannedStartDate');
            } else {
                colourStart = today;
            }

            if (item.get('ActualEndDate')){
                colourEnd = item.get('ActualEndDate');
            }
            else if (item.get('PlannedEndDate')) {
                colourEnd = item.get('PlannedEndDate');
            }
            else {
                colourEnd = today;
            }

            var totalElapsed = colourEnd - colourStart;

            //User params??
            var acceptanceDelay = totalElapsed * 0.2;
            var warningDelay    = totalElapsed * 0.2;

            colourStartDate = new Date(colourStart);
            colourEndDate = new Date(colourEnd);

            yellowXStart = Ext.Date.add(colourStartDate, Ext.Date.MILLI, acceptanceDelay);
            redXStart = Ext.Date.add(colourStartDate, Ext.Date.MILLI, acceptanceDelay + warningDelay);

            yellowSlope = 100 / (colourEnd - yellowXStart);
            redSlope = 100 / (colourEnd - redXStart);

            redThreshold =redSlope * (today - redXStart);
            yellowThreshold =yellowSlope * (today - yellowXStart);

            if (percentComplete < redThreshold ) {
                aRecord.colour = CustomApp.ErrorColour;
            }

            if (percentComplete < yellowThreshold ) {
                aRecord.colour = CustomApp.WarnColour;
            }

            if (today > colourEnd) {
                if (percentComplete >= 100) {
                    aRecord.colour = CustomApp.DoneColour;
                }
                else {
                    aRecord.colour = CustomApp.ErrorColour;
                }
            }

            //Now calculate the sizes and position

            startBetween = Ext.Date.between( actualStart, stats.start, stats.end);
            endBetween = Ext.Date.between( actualEnd, stats.start, stats.end);

           //If there is no start date in the item, the timeline will go back forever!
            if ( !startBetween && endBetween ){
                aRecord.leftMargin = 0;
                aRecord.width = (Ext.Date.getElapsed( stats.start, actualEnd?actualEnd:today)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            }

            //If there is no end date in the item, the timeline will go on forever!

            else if ( startBetween && !endBetween ) {
                aRecord.leftMargin = (Ext.Date.getElapsed( stats.start, actualStart)* stats.pixelsPerDay)/(24 * 3600 * 1000);
                aRecord.width = (Ext.Date.getElapsed( actualStart, item.get('ActualEndDate')?stats.end:today)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            }

            else if ( startBetween && endBetween) {
                aRecord.leftMargin = (Ext.Date.getElapsed( stats.start, actualStart)* stats.pixelsPerDay)/(24 * 3600 * 1000);
                aRecord.width = (Ext.Date.getElapsed( actualStart, item.get('ActualEndDate')?actualEnd:today)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            }

        }
        var actualBar = app._createBar(aRecord);
        actualBar.addCls('actualBar');
        actualBar.record = item;
        var actualsFields = [
            {
                'text' : 'Actual Start Date',
                'field': 'ActualStartDate'
            },
            {
                'text' : 'Actual End Date',
                'field': 'ActualEndDate'
            }

        ];


        actualBar.record = item;
        actualBar.tooltip = app._addTipInfo(actualBar, actualsFields);
        box.add(actualBar);

        return box;
    },

//        Ext.util.Observable.capture( pitype, function(event) { console.log( 'pitype:', arguments);});

    //Only call in the context of the rally-app to get the dimensions
    _calcTimeStats: function() {
        //We want to show a minimum of 1 pixel per day. We will start off looking at the window size. If that's OK, we draw to
        // fill the box. If we have got below 1 pixel per day, we need to use a wider box and then scroll bars.
        // The zoom level control may increase the minimum in pixel increments or 10%, whichever is the smaller.

        stats = {};

        // We want to show the whole month that it starts in and ends in
        stats.start =  new Date(Ext.Date.getFirstDateOfMonth(Ext.getCmp('StartDate').value));
        stats.end =  new Date(Ext.Date.getLastDateOfMonth(Ext.getCmp('EndDate').value));

        stats.daysDuration = (stats.end - stats.start)/ (24 * 3600 * 1000);
        stats.daysDuration = (stats.daysDuration > 31) ? stats.daysDuration : 31 ;
        var pixelsPerDay = (Ext.getBody().getWidth() - this.self.TreeBoxWidth) / (stats.daysDuration > 0 ? stats.daysDuration : 1) * this.zoomLevel;
        stats.pixelsPerDay = pixelsPerDay > 1 ? pixelsPerDay : 1;

        return stats;

    },

    _addMilestoneBox: function(app) {

        //We need to force a long box all across the lines box to house the milestone icons
        var lineBox = Ext.getCmp('lineBox');

        var milestoneBox = Ext.create('Ext.container.Container', {
            width: stats.daysDuration * stats.pixelsPerDay,
            height: '10px',
            id: 'milestoneBox',
            style: {
                backgroundColor: CustomApp.MileStoneBoxColour
            }
        });

        milestoneBox.addCls('mlbox');
        lineBox.add(milestoneBox);
    },

    _drawMonthBars: function() {

        var record = {};

        var monthBox = Ext.getCmp('monthBox');

        monthNum = stats.start.getMonth();
        var lDate = stats.start;
        var lDays = 0;

        while (lDate <= stats.end) {
            record.title = Ext.Date.format(lDate, 'M Y');
            record.colour = CustomApp.HdrColour;
            record.width = (this.self.DaysPerMonth[monthNum] * stats.pixelsPerDay);
            record.height = CustomApp.HeaderBoxHeight;

            var mnth = this._createBar(record);
            mnth.addCls('mnthBox');
            monthBox.add(mnth);
            lDate = Ext.Date.add(lDate, Ext.Date.MONTH, 1);

            monthNum += 1;
            if (monthNum > 11 ) { monthNum = 0;}
        }
    },

    _createBar: function( record ) {

        var margin = '0 0 0 ' + (record.leftMargin || 0);

        margin = record.margin || margin;// If we override the margin, use that.

        var bar =  Ext.create('Rally.app.CustomTimeLineBar', {
            id: 'TimeLineBar-' + Ext.id(),
            margin: margin,
            html: record.title || '',
            width: record.width,
            height: record.height || CustomApp.TimeLineBarHeight
        });
        bar.setStyle({ 'backgroundColor' : record.colour, 'textAlign' : record.align || 'center'});
        bar.tooltip = record.tooltip;
//        bar.record = record.record;

        return bar;
    }
});
