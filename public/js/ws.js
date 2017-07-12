/**
 * Created by kozhiganov on 10.07.2017.
 */
var socket;
(function(){
    socket = new WebSocket("ws://172.16.1.30:8081");

    socket.onopen = function() {
        console.log("ws:Соединение установлено.");
    };

    socket.onclose = function(event) {
        if (event.wasClean) {
            console.log('ws:Соединение закрыто чисто');
        } else {
            console.warn('ws:Обрыв соединения'); // например, "убит" процесс сервера
        }
        console.log('ws:Код: ' + event.code + ' причина: ' + event.reason);
    };

    socket.onmessage = function(event) {
        console.log("ws:Получены данные: " + event.data);
    };

    socket.onerror = function(error) {
        console.error("ws: Ошибка " + error.message);
    };
})();
