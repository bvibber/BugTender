$(function() {

    /**
     * @param {string} url base url, eg 'https://bugzilla.wikimedia.org'
     * @constructor
     */
    function Bugzilla(url) {
        var that = this;
        var target = url + '/jsonrpc.cgi';
        
        /**
         * @param {string} methods
         * @param {object} params
         * @return promise
         */
        this.call = function(method, params) {
            return jQuery.Deferred(function(deferred) {
                $.ajax({
                    url: target,
                    type: 'POST',
                    contentType: 'application/json; charset=UTF-8',
                    data: JSON.stringify({
                        version: '1.0',
                        method: method,
                        params: params
                    })
                }).then(function(data) {
                    if ('error' in data && data.error !== null) {
                        deferred.reject(data.error);
                    } else if ('result' in data) {
                        deferred.resolve(data.result);
                    } else {
                        deferred.reject('Missing result; invalid return?');
                    }
                }).fail(function(xhr, err) {
                    deferred.reject(err);
                });
            }).promise();
        };
    }

    var app = {
        /**
         * Prompt for authentication (if necessary) then pass credentials on.
         *
         * @return promise
         */
        authenticate: function() {
            return $.Deferred(function(deferred) {
                var $dialog = $('#auth-dialog');
                $dialog.bind('pagehide', function() {
                    $dialog.unbind('pagehide');
                    $login.unbind('click');
                    if (!deferred.isResolved()) {
                        deferred.reject();
                    }
                });

                var $login = $dialog.find('a.login');
                $login.click(function(event) {
                    console.log('clicked login');
                    var auth = {
                        user: $dialog.find('input[type=email]').val(),
                        pass: $dialog.find('input[type=password]').val()
                    };
                    deferred.resolve(auth);
                });

                $.mobile.changePage('#auth-dialog', {
                    role: 'dialog'
                });
            }).promise();
        }
    };

    /**
     * @param {Array of Bug objects} bugs
     */
    function showBugs(bugs) {
        var $list = $('#view ul');
        $list.empty();
        
        $.each(bugs, function(i, bug) {
            buildBugRow(bug).appendTo($list);
        });
        $list.listview('refresh');
    }

    function buildBugRow(bug) {
        var $li = $('<li>'),
            $a = $('<a>').appendTo($li);
        $a.text(bug.id + ' ' + bug.summary);
        
        $a.click(function(event) {
            event.preventDefault;
            /*
            var user = prompt('Username?'),
                pass = prompt('Password?');
            */
            app.authenticate().then(function(auth) {
                bz.call('Bug.add_comment', {
                    id: bug.id,
                    comment: 'Just testing Bugzilla tools (not the spammer)',
                    Bugzilla_login: auth.user,
                    Bugzilla_password: auth.pass
                }).then(function(result) {
                    console.log('auth done');
                    $('#view').empty().text(JSON.stringify(result));
                }).fail(function() {
                    console.log('hit failed');
                });
            }).fail(function() {
                console.log('auth canceled');
            });
        });
        return $li;
    }

    var bz = new Bugzilla(BugTender_target);
    window.bz = bz;
    
    // fixme doesn't trigger if we started on this page!?
    $('#buglist').bind('pageshow', function() {
        console.log('bug list loaded');
        bz.call('Bug.search', {
            summary: "android"
        }).then(function(result) {
            //$('#view').text(JSON.stringify(result));
            showBugs(result.bugs);
        });
    });

});
