var numPreflopRaises = 1;
var url = "http://localhost:8080";
var toSend = new Map();
const CALL = "CALL";
const FOLD = "FOLD";
const RAISE = "RAISE";
const CHECK = "CHECK";
const ACTIONS = new Set([CALL, FOLD, RAISE, CHECK]);
const BIG_BLIND = "BIG BLIND";
var currPlayer = 1;
var bigBlindPlayer = -1;

function nodeInsertedCallback(event) {
    var info = event.path;
    if (info.length == 11) {
        var seatsTemp = getSeats();
        var seats = new Array();
        var buttonPosition = pollButtonPosition();
        for (var j = 0; j < seatsTemp.length; j++) {
            if ($(seatsTemp[j]).find(".cards-container").find(".card-image").length > 0) {
                seats.push($(seatsTemp[j]));
            } else {
                if (j <= buttonPosition) {
                    buttonPosition--;
                }
            }
        }
        buttonPosition = buttonPosition % seats.length;
        if (!seats.length) {
            sendAndReset();
        } else if ($(".table-container").find(".community-card-container").length > 0) {
          for (var k = 0; k < seats.length; k++) {
              if (!$(seats[k]).hasClass("seat-folded")) {
                  var player = seats[k][0].innerText.split('\n')[0];
                  var existingToSend = toSend.get(player);
                  var holeCards = $(seats[k]).find(".cards-container").find(".card-image").find("span");
                  var changed = false;
                  for (var n = 0; n < holeCards.length; n++) {
                      for (var m = 0; m < existingToSend.length; m++) {
                          var card = holeCards[n].classList[3].split("-");
                          if (card.length > 3) {
                              // ace-of-diamonds
                              existingToSend[m]["Card" + n.toString()] = "ad";
                              changed = true;
                          } else if (card[2] == "back") {
                              break;
                          } else {
                              existingToSend[m]["Card" + n.toString()] = card[2];
                              changed = true;
                          }
                      }
                  }
                  if (changed) {
                      toSend.set(player, existingToSend);
                  }
              }
          }  
        } else {
            for (var k = 0; k < seats.length; k++) {
                if (seats[k].find(".action-text")[0].innerText.toUpperCase() == BIG_BLIND) {
                    bigBlindPlayer = k;
                    break;
                }
            }
            if (bigBlindPlayer != -1) {
                var currSeat = seats[(bigBlindPlayer + currPlayer) % seats.length];
                var currPlayerActionText = currSeat.find(".action-text")[0];
                var actionTextCapitalized;
                if (currPlayerActionText && currPlayerActionText.innerText) {
                    actionTextCapitalized = currPlayerActionText.innerText.toUpperCase();
                }
                var playerData = info[2].innerText.split('\n');
                if (actionTextCapitalized && ACTIONS.has(actionTextCapitalized)
                  && currSeat[0].innerText.split('\n')[0] == playerData[0])
                {
                    var amount = currSeat.find(".action-amount").find(".value");
                    var existingToSend = toSend.has(playerData[0]) ? toSend.get(playerData[0]) : [];
                    switch(actionTextCapitalized) {
                        case RAISE:
                            existingToSend.push(formatPlayerInnerTextWithoutAmount(playerData[0], 
                                actionTextCapitalized, currPlayer, seats.length, playerData[3]))
                            toSend.set(playerData[0], existingToSend);
                            numPreflopRaises++;
                            break;
                        case CALL:
                            existingToSend.push(formatPlayerInnerTextWithoutAmount(playerData[0], 
                                actionTextCapitalized, currPlayer, seats.length, playerData[3]))
                            toSend.set(playerData[0], existingToSend);
                            break;
                        case CHECK:
                            existingToSend.push(formatPlayerInnerTextWithoutAmount(playerData[0], 
                                actionTextCapitalized, currPlayer, seats.length))
                            toSend.set(playerData[0], existingToSend);
                            break;
                        case FOLD:
                            existingToSend.push(formatPlayerInnerTextWithoutAmount(playerData[0], 
                                actionTextCapitalized, currPlayer, seats.length))
                            toSend.set(playerData[0], existingToSend);
                            break;
                        default:
                            console.log(actionTextCapitalized + " not supported");
                    }
                    var i = 0;
                    do {
                        currPlayer++;
                        i++;
                    } while ($(seats[(currPlayer + bigBlindPlayer) % seats.length]).hasClass("seat-folded") 
                        && i < seats.length);
                }
            }
        }
    }
};

function sendAndReset() {
    if (toSend.size) {
        var data = [];
        var values = toSend.values();
        for (const item of values) {
            data = data.concat(item);
        }
        sendRequest(data);
    }
    toSend.clear();
    numPreflopRaises = 1;
    currPlayer = 1;
    bigBlindPlayer = -1;
}

function getPosition(pos, seatsLength) {
    switch((seatsLength - pos) % seatsLength) {
        case 0:
            return "BB";
        case 1: 
            if (seatsLength == 2) return "D";
            return "SB";
        case 2:
            return "D";
        case 3: 
            return "CO";
        case 4:
            return "HJ";
        case 5:
            return "UTG";
    }
}

function formatPlayerInnerTextWithoutAmount(username, actionText, modifiedSeat, seatsLength) {
    return {"Username": username,
            "Action": actionText,
            "Position": getPosition(modifiedSeat % seatsLength, seatsLength),
            "NumRaises": numPreflopRaises,
            "NumPlayers": seatsLength}
}

// function formatPlayerInnerText(username, actionText, modifiedSeat, seatsLength, amount) {
//     return {"Username": username,
//             "Action": actionText,
//             "Position": getPosition(modifiedSeat % seatsLength, seatsLength),
//             "NumRaises": numPreflopRaises,
//             "Amount": amount}
// }

function pollButtonPosition() {
    var pos = $(".dealer-button").offset();
    var table = $(".table-container");
    if (pos.left * 2.7 <= table.width()) {
        if (pos.top * 2.7 <= table.height()) {
            return 2;
        } else {
            return 1;
        }
    }
    else if (pos.left * 1.8 <= table.width()) {
        if (pos.top * 2.7 <= table.height()) {
            return 3;
        } else {
            return 0;
        }
    }
    else {
        if (pos.top * 2.7 <= table.height()) {
            return 4;
        } else {
            return 5;
        }
    }
    console.log(pos);
    return -1;
}

function getSeats() {
    return $(".table-container").find(".seat").not(".seat-hidden").not(".seat-empty");
}

function sendRequest(data) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", url);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    var out = JSON.stringify(data);
    //console.log(out);
    xmlhttp.send(out);
}

document.addEventListener('DOMNodeInserted', nodeInsertedCallback);
