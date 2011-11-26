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
        },

        /**
         * @param {Array of Bug objects} bugs
         */
        showBugs: function(bugs) {
            var $list = $('#view ul');
            $list.empty();
            
            $.each(bugs, function(i, bug) {
                app.buildBugRow(bug).appendTo($list);
            });
            $list.listview('refresh');
        },

        buildBugRow: function(bug) {
            var $li = $('<li>'),
                $a = $('<a>').attr('href', '#bug' + bug.id).appendTo($li);
            $a.text(bug.id + ' ' + bug.summary);
            return $li;
        },

        showBugView: function(id) {
            return $.Deferred(function(deferred) {
            
                if (typeof id !== 'number'
                    || id <= 0
                    || id !== parseInt(id + '')) {
                    deferred.reject('Invalid bug id');
                    return;
                }

                $.mobile.changePage('#bug' + id);
            }).promise();
        },
        
        preinitPage: function(toPage) {
            var matches = toPage.match(/#bug(\d+)$/);
            if (matches) {
                var id = parseInt(matches[1]),
                    $view = $('#bug' + id);
                if ($view.length == 0) {
                    // Haven't seen this bug yet; create a view for it
                    $view = $('#bugview').clone().attr('id', 'bug' + id).appendTo('body');
                }

                $view.find('h1').text('Bug $1'.replace('$1', id + ''));
                bz.call('Bug.get', {
                    ids: [id]
                }).then(function(result) {
                    var bug = result.bugs[0];
                    $view
                        .find('.summary')
                            .text(bug.summary)
                            .end()
                        .find('.severity').text(bug.severity).end()
                        .find('.priority').text(bug.priority).end()
                        .find('.keywords').text(bug.keywords.join(', ')).end()
                        .find('.dependencies').text(bug.keywords.length + '').end()
                        .find('.assigned')
                            .text(bug.assigned_to)
                            .end()
                        .find('.status')
                            .text(bug.status)
                            .end()
                        .find('.raw')
                            .text(JSON.stringify(bug))
                            .end();
                });
                
                // Load comments separately.
                // @todo load comments in chunks?
                bz.call('Bug.comments', {
                    ids: [id]
                }).then(function(result) {
                    $.each(result.bugs[id].comments, function(i, comment) {
                        console.log(comment);
                        app.renderComment(comment).appendTo($view.find('.comments'));
                    });
                });
            }
            
            if (toPage.match(/#buglist$/)) {
                bz.call('Bug.search', {
                    summary: "android"
                }).then(function(result) {
                    app.showBugs(result.bugs);
                });
            }
        },
        
        /**
         * @return jQuery
         */
        renderComment: function(comment) {
            return $('<div>')
                .append(
                    $('<div>').text(comment.author)
                ).append(
                    $('<div>').text(comment.time)
                ).append(
                    $('<div>').text(comment.text)
                );
        }
    };

    var bz = new Bugzilla(BugTender_target);
    window.bz = bz;
    
    $(document).bind('pagebeforechange', function(e, data) {
        if (typeof data.toPage === "string") {
            app.preinitPage(data.toPage);
        }
    });
    // hack? to get the initial 'page' to initialize after reloading or following a #link
    if (document.location.hash !== '') {
        $.mobile.changePage(document.location.hash);
    }

            /*
            var user = prompt('Username?'),
                pass = prompt('Password?');
            */
            /*
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
            */

});
