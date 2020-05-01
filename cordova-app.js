//Version 2020.4.30.1
//Game:
var gameCustomId = "xxx";
var oneSignalAppId = "xxx";
var vCurrencyName = "ST";

//Table Mappings:
var tableMappings = {
    "storeItems" : {
        type:"serviceCall",
        enabled: true,
        isDebug: true,
        tableColumnsValues:["ItemClass","DisplayName","VirtualCurrencyPrices.ST","Description"]
        
        /* Example payloadItem:
         {
             "ItemId": "LHint",
             "CatalogVersion": "1",
             "DisplayName": "Hint",
             "Description": "Show the placement of 1 letter.",
             "VirtualCurrencyPrices": {
                 "ST": 100
             },
             "Tags": [],
             "Consumable": {},
             "CanBecomeCharacter": false,
             "IsStackable": true,
             "IsTradable": false,
             "IsLimitedEdition": false,
             "InitialLimitedEditionCount": 0
         }
         
         */
    },
    "HighScore" : {
        type:"leaderboard",
        enabled: true, //Populate table if sent in.
        isDebug: false, //Print out logs.
        tableName: "HighScore", //Name of table.
        tableColumnsValues:["Position","Profile.DisplayName","StatValue"], //Items to populate table with from data coming in.
        maxResults:5
    },
    "facebook" : {
        type:"serviceCall",
        enabled: true,
        isDebug: false,
        tableName: "facebook"
    },
    "playfab" : {
        type:"serviceCall",
        enabled: true,
        isDebug: true,
        tableName: "playfab",
        tableColumnsValues:[1],
        tableRowValues:["UserVirtualCurrency.ST"]

        /* Example payload
        {"UserInventory":[],"UserVirtualCurrency":{"ST":1000},"UserVirtualCurrencyRechargeTimes":{},"UserData":{"avatar":{"Value":"4","LastUpdated":"2020-04-19T16:07:03.876Z","Permission":"Public"},"playSound":{"Value":"false","LastUpdated":"2020-04-15T03:38:27.842Z","Permission":"Public"}},"UserDataVersion":52,"UserReadOnlyDataVersion":0,"CharacterInventories":[]}
        */
    },
    "oneSignal" : {
        type:"serviceCall",
        enabled: true,
        isDebug: false,
        tableName: "playfab",
        tableColumnsValues:[1],
        appId: oneSignalAppId, //One signal appId
        tableRowValues:["notification.shown", "notification.payload.subtitle", "notification.payload.title", "action"]

        /* Example payload 
        {"notification":{"shown":true,"payload":{"rawPayload":{"aps":{"alert":{"subtitle":"test","title":"test","body":"test"},"mutable-content":1,"sound":"default"},"custom":{"i":"5484a91f-db0c-4e18-ba5f-dc413fa31d1f"}},"subtitle":"test","title":"test","sound":"default","body":"test","notificationID":"5484a91f-db0c-4e18-ba5f-dc413fa31d1f","actionButtons":[]},"isAppInFocus":false,"displayType":1},"action":{}}
        */
    }
    
};

//Retrieve from Playfab
var infoRequestParameters = {
    GetUserData:true,
    GetUserVirtualCurrency:true
};

//Leaderboards:
var leaderboardName = "HighScore";

//Attributes:
var attributeMappings = {"avatar":"id187673", "playSound":"id569651"};

//No need to modify anything under this line.
//-----------------------
var playfabTable;
var catalogTable;

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    
    getTableRequest: function(table) {
        
        var tableName = table.getName();
        
        if (tableMappings[tableName].type === "leaderboard") {
            app.getLeaderboard(table);
            
        } else {
            switch (tableName){
                case 'facebook':
                    var statusRowIndex = table.getTableData().lookupRow("status");
                    var isConnected = false;
                    
                    if (statusRowIndex > 0 && table.getCellSafe(statusRowIndex ,1 ) == "connected") {
                        isConnected = true;
                    }
                    
                    if (isConnected === false) {
                        app.loginFacebook(table);
                        
                    } else {
                        app.logoutFacebook(table);
                        
                    }
                    break;

                case 'playfab':
                    playfabTable = table;
                    app.loginWithIOSDeviceID(gameCustomId, playfabTable);
                    break;
                
                case 'storeItems':
                    catalogTable = table;
                    app.getCatalogItems(catalogTable);
                    break;
                    
                default:
                    break;
            }
            
        }
        
        
   },
    
    //------------
    //Facebook Section.
    //------------
    
    logoutFacebook: function() {
        function facebookSuccess (event) {
            table.getTableData().setRowName(1, "status");
            table.setCellSafe(1, 1, "connected");
                
            
        }
        
        function facebookFailed (event) {
            console.error("*** logoutFacebook:", event);
           
        }
        
        
        facebookConnectPlugin.logout(facebookSuccess, facebookFailed);
    },
    
    loginFacebook: function(table) {
        
        function facebookSuccess (event) {
            
            if (event.status &&
                event.status === "connected" &&
                event.authResponse &&
                event.authResponse.accessToken) {
                
                    table.getTableData().setRowName(1, "status");
                    table.setCellSafe(1, 1, "connected");
                
                    
                    if (table.getRowCount() < 2) {
                        table.addRow(2);
                    }
                    
                    table.getTableData().setRowName(2, "accessToken");
                    table.setCellSafe(2, 1, event.authResponse.accessToken);
                
                    app.linkFacebookAccount(event.authResponse.accessToken);
                
                    facebookConnectPlugin.api("me/?fields=short_name", ["public_profile"],
                      function onSuccess (result) {
                        
                        if (result && result.short_name) {
                            if (table.getRowCount() < 3) {
                                table.addRow(3);
                            }
                            
                            table.getTableData().setRowName(3, "displayName");
                            table.setCellSafe(3, 1, result.short_name);
                        
                            app.updateUserTitleDisplayName( result.short_name );
                        }
                        
                      }, function onError (error) {
                        console.error("*** loginFacebook: ", error);
                      }
                    );
                
                }
           
        }
        
        function facebookFailed (event) {
            console.error("Facebook:", event);
            table.getTableData().setRowName(1, "status");
            table.setCellSafe(1, 1, "notConnected");
                
           
        }
        
        facebookConnectPlugin.login(["public_profile"], facebookSuccess, facebookFailed);
    },
    
    //------------
    //GameSalad Helpers
    //------------
    getPropertyValue: function(obj, propertyPath) {
        if(typeof obj === 'undefined') {
            return false;
        }

        var _index = propertyPath.indexOf('.');
        if(_index > -1) {
            return app.getPropertyValue(obj[propertyPath.substring(0, _index)], propertyPath.substr(_index + 1));
        }

        return obj[propertyPath];
    },
    
    populateTable: function(table, dataSource, tableColumnsValues, tableRowValues) {
        
        var columns = tableColumnsValues;
        var rows;
        
        if (Array.isArray( dataSource ) === true) {
            rows = dataSource;
            
        } else {
            rows = tableRowValues;
            
        }
        
        var tableRowCount = table.getRowCount();
        var rNumber = 0;
        
        for (var i in rows) {

            rNumber = rNumber + 1;
            if (i + 1 > tableRowCount && rows.length > rNumber) {
               table.addRow(rNumber);
            }

            var cNumber = 0;
            
            for (var j in columns) {

                
                cNumber = cNumber + 1;

                var value;
                if (Array.isArray( dataSource ) === true) {
                    value = app.getPropertyValue(dataSource[i],columns[j]);

                    if (cNumber === 1) {
                        table.getTableData().setRowName(rNumber, value);
                    }
                } else {

                    value = app.getPropertyValue(dataSource,rows[j]);

                    if (cNumber === 1) {

                        table.getTableData().setRowName(rNumber, rows[j] + "");
                    }
                }
                table.setCellSafe(rNumber, cNumber, value);
            }
        }


        
    },
    populateGameAttributes: function(dataSource, mappings) {
        
        for (var i in mappings) {
            gse.Game.externalWriteGameAttribute('game.attributes.'+mappings[i], dataSource[i].Value);
        }
        
    },
    
    //------------
    //Playfab
    //------------
    purchaseItem: function(table, itemId, price, virtualCurrency) {
        
        function  purchaseItemCallback (result, error) {
            if (result !== null) {
                console.log("*** purchaseItemCallback:", JSON.stringify(result) );
                
            } else if (error !== null) {
                console.error("*** purchaseItemCallback:", JSON.stringify(error) );
                
            }
            
            
        }
        
        var purchaseItemRequest = {
            ItemId: itemId,
            Price: price,
            VirtualCurrency: virtualCurrency
        };
        
        PlayFabClientSDK.PurchaseItem(purchaseItemRequest, purchaseItemCallback);
        
    },
    getCatalogItems: function(table) {

        if (tableMappings.storeItems.enabled === false ) {
            return;
        }
        
        function  getCatalogItemsCallback (result, error) {
            if (result !== null) {
                
                if (result.data.Catalog) {
                    var items = result.data.Catalog;
                    app.populateTable(table, items, tableMappings[table.getName()].tableColumnsValues, null);
                                  
                }    

            } else if (error !== null) {
                console.error("*** getCatalogItemsCallback:", JSON.stringify(error) );
                
            }
            
        }
        
        var getCatalogItemsRequest = {
        };
        
        PlayFabClientSDK.GetCatalogItems(getCatalogItemsRequest, getCatalogItemsCallback);
        
    },

    subtractUserVirtualCurrency: function(amount, virtualCurrency) {
        function  subtractUserVirtualCurrencyCallback (result, error) {
            if (result !== null) {
                
            } else if (error !== null) {
                console.error("*** subtractUserVirtualCurrencyCallback:", JSON.stringify(error) );
                
            }
            
        }
        
        var subtractUserVirtualCurrencyRequest = {
            Amount: amount,
            VirtualCurrency: virtualCurrency
            
        };
        
        PlayFabClientSDK.SubtractUserVirtualCurrency(subtractUserVirtualCurrencyRequest, subtractUserVirtualCurrencyCallback);
        
        
    },
    
    updateUserTitleDisplayName:function(displayName) {
        function  updateUserTitleDisplayNameCallback (result, error) {
            if (result !== null) {
                
            } else if (error !== null) {
                console.error("*** updateUserTitleDisplayNameCallback:", JSON.stringify(error) );
                
            }
            
        }
        
        var updateUserTitleDisplayNameRequest = {
            DisplayName: displayName
        };
        
        PlayFabClientSDK.UpdateUserTitleDisplayName(updateUserTitleDisplayNameRequest, updateUserTitleDisplayNameCallback);
        
    },

    linkFacebookAccount: function(accessToken) {
        function  linkFacebookAccountCallback (result, error) {
            if (result !== null) {
                
            } else if (error !== null) {
                console.error("*** linkFacebookAccountCallback:", JSON.stringify(error) );
                
            }
            
        }
        
        var linkFacebookAccountRequest = {
            AccessToken: accessToken,
            ForceLink: true
        };
        
        PlayFabClientSDK.LinkFacebookAccount(linkFacebookAccountRequest, linkFacebookAccountCallback);
        
        
    },
    
    getLeaderboard: function(table) {
        function getLeaderboardCallback (result, error) {
            if (result !== null) {
                var leaderboards = result.data.Leaderboard;
                app.populateTable(table, leaderboards, tableMappings.leaderboard.tableColumnsValues, null);
            
            } else if (error !== null) {
                console.error("*** getLeaderboard", error);
                
            }
            
        }
        
        var getLeaderboardRequest = {
            StartPosition: 0,
            StatisticName: table.getName(),
            MaxResultsCount: tableMappings[table.getName()].maxResults
        };
        
        PlayFabClientSDK.GetLeaderboard(getLeaderboardRequest, getLeaderboardCallback);
        
    },
    
    updateUserData: function(value, key) {
        function updateUserDataCallback (result, error) {
            if (result !== null) {
                
            } else if (error !== null) {
                console.error("*** updateUserData", error);
                
            }
            
        }
        
        var data = {};
        data[value] = key;
        
        var userDataRequest ={
              Data:data,
              Permission: "Public"
        };
        
        PlayFabClientSDK.UpdateUserData(userDataRequest, updateUserDataCallback);
    },
    
    updateUserStats: function(name, value) {
        function updateUserStatsCallback (result, error) {
            if (result !== null) {
                
            } else if (error !== null) {
                console.error("*** updateUserStats", error);
                
            }
        }
        
        var updateUserStatsRequest = {
        Statistics: [ {
            StatisticName: leaderboardName,
            Value: value } ]
        };
        
        
         PlayFabClientSDK.UpdatePlayerStatistics(updateUserStatsRequest, updateUserStatsCallback);
        
    },
    
    getUserData: function() {
        function getUserDataCallback (result, error) {
            if (result !== null) {
                
                app.populateGameAttributes(result.data.Data, attributeMappings);
                
            } else if (error !== null) {
                console.error("*** getUserData", error);
                
            }
            
        }
        
        
        var userDataRequest = {
            
        };
                                     
        PlayFabClientSDK.GetUserData(userDataRequest, getUserDataCallback);
        
    },
    
    loginWithIOSDeviceID: function(titleId, table){
        
        function loginWithIOSDeviceIDCallback (result, error) {


            if (result !== null) {
                if (tableMappings.playfab.isDebug === true){
                    console.log("*** loginWithIOSDeviceIDCallback: ", JSON.stringify(result.data));
                }
                
                if (result.data &&
                result.data.InfoResultPayload &&
                result.data.InfoResultPayload.UserData) {

                    app.populateGameAttributes(result.data.InfoResultPayload.UserData, attributeMappings);
                    app.populateTable(table, result.data.InfoResultPayload, tableMappings.playfab.tableColumnsValues, tableMappings.playfab.tableRowValues );
                }

                if (tableMappings.oneSignal.enabled === true && 
                    result.data &&
                    result.data.PlayFabId) {
                        window.plugins.OneSignal.setExternalUserId(result.data.PlayFabId);
                        
                }

               
            } else if (error !== null) {
                console.error("*** loginWithIOSDeviceID:", error);
                
            }
        }
        
        
        PlayFab.settings.titleId = titleId;
        
        var loginWithIOSDeviceIDRequest = {
            TitleId: titleId,
            DeviceId: device.uuid,
            DeviceModel: device.model,
            OS: device.version,
            InfoRequestParameters: infoRequestParameters,
            CreateAccount: true
        };

        PlayFabClientSDK.LoginWithIOSDeviceID(loginWithIOSDeviceIDRequest, loginWithIOSDeviceIDCallback);
    },

    
    
    // deviceready Event Handler
    //
    // The scope of 'this' is the event.
    onDeviceReady: function() {

			gse.ready(function(engine) {
                
				var loadingElement = document.getElementById('gse-loading');
				var playerDelegate = {
                    
                    onIAPRequestPurchaseData: function() {
                        
                    },

                    onTweetSheet: function(msg, img) {
                        
                        var statusRowIndex = catalogTable.getTableData().lookupRow(msg);
                        var itemPrice = catalogTable.getCellSafe(statusRowIndex , 3);
                        
                        app.purchaseItem(playfabTable, msg, itemPrice ,vCurrencyName);
                            
                    },
                    
                    onBannerShow: function(grid) {
                        
                    },

                onCurrentSceneChanged: function (sceneKey, sceneName, enableAdvertisement) {
                    
                    if (sceneName === "Menu") {
                        
                        
                    }
                    
                    
                },

                onGameCenterPostScore: function (score, leaderboard) {
                    
                    
                    switch (leaderboard){
                        case 'sendScore':
                            app.updateUserStats(leaderboardName, score);
                            break;
                        case 'getTable':
                            app.getTableRequest(score);
                            break;
                        default:
                            app.updateUserData(leaderboard, score);
                            break;
                    }
                    
                },

                onGameCenterUpdateAchievement: function (identifier, percentageComplete) {
                  try {
                    switch (identifier) {
                      case 'complete':
                        break;
                            
                      case 'currentProgress':
                        break;
                            
                      case 'maximumProgress':
                        break;
                            
                    }
                  } catch (e) {
                    console.error(e);
                  }
                },

                onLoadingBegin: function () {
                  engine.showOverlay();
                },

                onLoadingEnd: function () {
                  engine.hideOverlay();
                },

                onGameDimensionsKnown: function (width, height) {
                },

                onGameReady: function (width, height) {
                  
                },

                onWindowResize: function () {
                  engine.relayout();
                }
                    
				};
				engine.appendDelegate(playerDelegate);
				window.addEventListener('resize', playerDelegate.onWindowResize, false);

				engine.setRenderFrame('gse-player');
				engine.setOptions({
					'viewport-reference': 'window',
					'viewport-fit': 'overscan'
				});
				engine.loadOptionsFromURL();
                engine.play();

                if (tableMappings.oneSignal.enabled === true) {

                    var oneSignalLogLevel = 0;
                    if (tableMappings.oneSignal.isDebug === true) {
                        oneSignalLogLevel = 6;
                    }


                    window.plugins.OneSignal.setLogLevel({logLevel:oneSignalLogLevel, visualLevel: 0});    
                    var notificationOpenedCallback = function(jsonData) {

                        if (playfabTable) {
                            app.populateTable( playfabTable, jsonData, tableMappings.oneSignal.tableColumnsValues, tableMappings.oneSignal.tableRowValues);

                        }
                        
                        if (tableMappings.oneSignal.isDebug === true) {
                            console.log('*** initOneSignalCallback: ', JSON.stringify(jsonData));
                        }
                    };

                    window.plugins.OneSignal
                        .startInit(oneSignalAppId)
                        .handleNotificationOpened(notificationOpenedCallback)
                        .endInit();

                }
                
                    
			});
    }
};

app.initialize();
