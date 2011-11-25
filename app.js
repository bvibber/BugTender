$(function() {

    /**
     * @param {string} url base url, eg 'https://bugzilla.wikimedia.org'
     * @constructor
     */
    function Bugzilla(url) {
        var that = this;
        var service = new rpc.ServiceProxy(url + '/jsonrpc.cgi', {
            asynchronous: true,
            sanitize: false, // jsonp
            methods: ['Bug.search', 'Bug.get', 'Bug.add_comment'],
            callbackParamName: 'callback'
        });

        var proxy = function(method, call, params) {
            return jQuery.Deferred(function(deferred) {
                var xparams = $.extend({method: method}, params);
                call({
                    params: {
                        method: method,
                        params: JSON.stringify([params])
                    },
                    onSuccess: function(json) {
                        deferred.resolve(json);
                    },
                    onError: function(err) {
                        deferred.reject(err);
                    }
                });
            }).promise();
            return deferred.promise();
        };

        var makeProxy = function(method, call) {
            return function(params) {
                return proxy(method, call, params);
            };
        };

        this.Bug = {
            search: makeProxy('Bug.search', service.Bug.search),
            get: makeProxy('Bug.get', service.Bug.get),
            add_comment: makeProxy('Bug.add_comment', service.Bug.add_comment)
        }
    }

    /**
     * @param {Array of Bug objects} bugs
     */
    function showBugs(bugs) {
        var $table = $('<table class="buglist"><thead></tead><tbody></tbody></table>'),
            $thead = $table.find('thead'),
            $tbody = $table.find('tbody');

        $('#view').empty().append($table);
        
        $.each(bugs, function(i, bug) {
            buildBugRow(bug).appendTo($tbody);
        });
    }

    function buildBugRow(bug) {
        var $tr = $('<tr>'),
            $button = $('<button>').text('Test comment');
        $('<td>').text(bug.id).appendTo($tr);
        $('<td>').text(bug.summary).appendTo($tr);
        $('<td>').append($button).appendTo($tr);
        
        $button.click(function() {
            var user = prompt('Username?'),
                pass = prompt('Password?');
            bz.Bug.add_comment({
                id: bug.id,
                comment: 'Just testing Bugzilla tools',
                Bugzilla_login: user,
                Bugzilla_password: pass
            });
        });
        return $tr;
    }

    var bz = new Bugzilla('https://bugzilla.wikimedia.org');
    window.bz = bz;
    bz.Bug.search({
        summary: "android"
    //bz.Bug.get({
    //    ids: [1234]
    }).then(function(result) {
        //$('#view').text(JSON.stringify(result));
        showBugs(result.bugs);
    });

});
