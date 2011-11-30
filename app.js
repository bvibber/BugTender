
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

    function LocalStore(bz) {
        var that = this;
        var types = {
            bug: function(ids) {
                return $.Deferred(function(deferred) {
                    bz.call('Bug.get', {ids: ids})
                    .then(function(data) {
                        var bugs = {};
                        $.each(data.bugs, function(i, bug) {
                            bugs[bug.id] = bug;
                        });
                        deferred.resolve(bugs);
                    }).fail(function(err) {
                        deferred.reject(err);
                    });
                }).promise();
            }
        };

        var stored = {
            bug: {}
        };

        /**
         * @param string kind
         * @param number or array of numbers: ids
         * @return promise; on completion sends a map of ids -> bug objects
         */
        this.get = function(kind, ids) {
            if (!(kind in stored)) {
                throw new Error("Unknown cache obj kind " + kind);
            }
            if (!$.isArray(ids)) {
                ids = [ids];
            }
            var results = {};
            var unseen = $.map(ids, function(id) {
                if (id in stored[kind]) {
                    // Return the already-seen copy
                    results[id] = stored[kind][id];
                    return [];
                } else {
                    // Keep it in our list to load
                    return [id];
                }
            });
            return $.Deferred(function(deferred) {
                if (unseen.length) {
                    types[kind](ids).then(function(data) {
                        that.remember(kind, data);
                        $.extend(results, data);
                        deferred.resolve(data);
                    }).fail(function(err) {
                        deferred.reject(err);
                    });
                } else {
                    deferred.resolve(results);
                }
            }).promise();
        };
        
        this.remember = function(kind, map) {
            $.extend(stored[kind], map);
        };
    }

(function($) {

    var app = window.app = {
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
            var $li = $('<li>' +
                          '<a>' +
                            '<p class="ui-li-aside ui-li-desc"></p>' +
                            '<h3 class="ui-li-heading"></h3>' +
                          '</a>' +
                        '</li>');
            return $li
                .find('a')
                    .attr('href', '#bug' + bug.id)
                    .end()
                .find('p')
                    .text(app.formatShortField(bug, app.sortField()))
                    .end()
                .find('h3')
                    .text(bug.summary)
                    .addClass('status-' + bug.status.toLowerCase())
                    .addClass('priority-' + bug.priority.toLowerCase())
                    .addClass('severity-' + bug.severity.toLowerCase())
                    .end();
        },

        formatShortField: function(bug, field) {
            if (!(field in bug)) {
                throw new Error("Asked for non-present field: " + field);
            }
            var val = bug[field];
            if (field == 'creation_time' || field == 'last_change_time') {
                return app.prettyTimestamp(val);
            }

            return val + '';
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
            var route = function(regex, template) {
                var matches = toPage.match(regex);
                if (matches) {
                    var $view = $(matches[0]);
                    if (template) {
                        if ($view.length == 0) {
                            // Haven't seen this page yet; create a view for it
                            $view = $(template).clone()
                                .attr('id', matches[0].substr(1))
                                .appendTo('body');
                        }
                    }
                }
            }
            route(/#bug(\d+)$/, '#bug-template');
            route(/#comments(\d+)$/, '#comments-template');
            route(/#deps(\d+)$/, '#deps-template');
            /*
            route(/#buglist$/, function() {
                bz.call('Bug.search', {
                    summary: "android"
                }).then(function(result) {
                    app.showBugs(result.bugs);
                });
            });
            */
        },
        
        extractId: function($view) {
            var idAttr = $view.attr('id');
            if (!idAttr) {
                throw new Error("element has no id for extractId");
            }
            var matches = idAttr.match(/(\d+)$/);
            if (!matches) {
                throw new Error("element id format is not valid for extractId");
            }
            return parseInt(matches[1]);
        },

        initBugView: function($view) {
            var id = app.extractId($view);
            $view
                .find('h1')
                    .text('Bug $1'.replace('$1', id + ''))
                    .end()
                .find('a.comments')
                    .attr('href', '#comments' + id)
                    .end()
                .find('a.deps')
                    .attr('href', '#deps' + id)
                    .end();
            app.cache.get('bug', id)
            .then(function(bugs) {
                var bug = bugs[id];
                $view
                    .find('.summary')
                        .text(bug.summary)
                        .end()
                    .find('.severity').text(bug.severity).end()
                    .find('.priority').text(bug.priority).end()
                    .find('.keywords').text(bug.keywords.join(', ')).end()
                    .find('.deps-count').text(bug.keywords.length + '').end()
                    .find('.assigned')
                        .text(bug.assigned_to)
                        .end()
                    .find('.status')
                        .text(bug.status)
                        .end();
            });
            
            // Load comments separately.
            // @todo load comments in chunks?
            app.bz.call('Bug.comments', {
                ids: [id]
            }).then(function(result) {
                var comments = result.bugs[id].comments;
                $view.find('.comments-count').text(comments.length + '');
                //app.recordSeenComments(id, comments);
            });
        },

        initDepsView: function($view) {
            var id = app.extractId($view);
        },

        initCommentsView: function($view) {
            var id = app.extractId($view),
                $comments = $view.find('.comments');
            // @todo we've probably already got these; use saved ones
            app.bz.call('Bug.comments', {
                ids: [id]
            }).then(function(result) {
                var comments = result.bugs[id].comments;
                $comments.empty();
                $.each(comments, function(i, comment) {
                    app.renderCommentInList(comment).appendTo($comments);
                });
                $comments.listview('refresh');
            });
        },

        /**
         * @return jQuery
         */
        renderCommentInList: function(comment) {
            var snippet = comment.author.replace(/@.*$/, '') + ' ' + app.prettyTimestamp(comment.time);
            return $(
                '<div class="comment" data-role="collapsible">' +
                    '<h3 class="snippet"></h3>' +
                    '<p><a class="author" href="#user-template"></a></p>' +
                    '<p class="time"></p>' +
                    '<p class="text"></p>' +
                '</div>'
            ).find('.snippet').text(snippet).end()
            .find('.author').text(comment.author).end()
            .find('.time').text(comment.time).end()
            .find('.text').text(comment.text).end()
            .collapsible();
        },
        
        /**
         * Format an attractive timestamp, with precision depending on
         * distance to current time.
         *
         * @param {String} ts
         * @return String
         */
        prettyTimestamp: function(ts, origin) {
            var date = new Date(app.parseDate(ts)),
                now = origin || new Date(),
                interval = (now.getTime() - date.getTime()) / 1000;
            if (interval < 30) {
                return 'just now';
            } else if (interval < 3600) {
                return Math.round(interval / 60) + ' minutes ago';
            } else if (interval < 86400) {
                return Math.round(interval / 3600) + ' hours ago';
            } else if (interval < 86400 * 31) {
                return Math.round(interval / 86400) + ' days ago';
            } else {
                return date.toLocaleDateString();
            }
        },

        /**
         * Get Bugzilla resolution options matching our selected states.
         *
         * @return Array of strings
         */
        getSelectedResolutions: function() {
            var state = $('input[name=adv-state]:checked').val();
            if (state == 'open') {
                return ['', 'REOPENED', 'LATER'];
            } else if (state == 'fixed') {
                return ['FIXED'];
            } else if (state == 'rejected') {
                return ['INVALID', 'WONTFIX', 'DUPLICATE', 'WORKSFORME'];
            } else {
                throw new Error("Unrecognized state " + state);
            }
        },

        updateBugList: function() {
            if (app.bugSearchTimeout === undefined) {
                // Wait a fraction of a second, more keystrokes may be coming
                app.reallyUpdateBugList();
                app.bugSearchTimeout = window.setTimeout(function() {
                    app.bugSearchTimeout = undefined;
                    app.reallyUpdateBugList();
                }, 250);
            }
        },
        
        reallyUpdateBugList: function() {
            var $search = $('#bugsearch'),
                terms = $.trim($search.val());
            var queue = ++app.bugSearchQueue,
                byId = {bugs: []},
                bySummary = {bugs: []},
                resolution = app.getSelectedResolutions();

            if (terms.match(/^\d+$/)) {
                var bugId = parseInt(terms);
                byId = app.bz.call('Bug.search', {
                    id: bugId
                });
            }
            var options = {
                limit: 200,
                resolution: resolution
            };
            if (terms.length) {
                options.summary = terms;
            }
            bySummary = app.bz.call('Bug.search', options);
            
            $.when(byId, bySummary)
            .then(function(idResult, termsResult) {
                if (app.bugSearchQueue == queue) {
                    var bugs = [].concat(idResult.bugs).concat(termsResult.bugs);
                    
                    bugs.sort(app.bugSortFunction()).reverse();

                    // Remember these bugs for later
                    var map = {};
                    $.each(bugs, function(i, bug) {
                        map[bug.id] = bug;
                    });
                    app.cache.remember('bug', map);
                    app.showBugs(bugs);
                } else {
                    // @fixme save for later anyway?
                }
            });
        },

        sortField: function() {
            return $('input[name=adv-sort]:checked').val();
        },

        bugSortFunction: function() {
            var sortField = app.sortField();
            var sortMap = {
                id: app.genericSorter,
                creation_time: app.dateSorter,
                last_change_time: app.dateSorter,
                priority: app.genericSorter,
                resolution: app.genericSorter
            };
            if (!(sortField in sortMap)) {
                throw new Error("Unsupported sort field: " + sortField);
            }
            var sorter = sortMap[sortField];
            return function(a, b) {
                return sorter(a[sortField], b[sortField]);
            };
        },

        dateSorter: function(a, b) {
            var da = app.parseDate(a),
                db = app.parseDate(b);
            return app.genericSorter(da, db);
        },

        genericSorter: function(a, b) {
            if (a == b) {
                return 0;
            } else if (a < b) {
                return -1;
            } else {
                return 1;
            }
        },
        
        parseDate: function(d) {
            return Date.parse(d);
        },

        bugSearchQueue: 0,

        init: function() {
            app.bz = new Bugzilla(BugTender_target);
            app.cache = new LocalStore(app.bz);
            
            /** Set up initializers for each page type */
            $('#buglist').live('pageinit', function() {
                $('#buglist .bugsearch').bind('change keyup cut paste', function(event) {
                    app.updateBugList();
                });
                $('#search-form').submit(function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    $('#bugsearch').blur(); // Close software keyboard?
                    app.updateBugList();
                });
            });
            $('#search-options').live('pageinit', function() {
                $('#search-options input').change(function() {
                    app.updateBugList();
                });
            });
            $('.bug-page').live('pageinit', function() {
                app.initBugView($(this));
            });
            $('.comments-page').live('pageinit', function() {
                app.initCommentsView($(this));
            });
            $('.deps-page').live('pageinit', function() {
                app.initDepsView($(this));
            });
        
            /** Autocreate bug pages on demand */
            $(function() {
                $(document).bind('pagebeforechange', function(e, data) {
                    if (typeof data.toPage === "string") {
                        app.preinitPage(data.toPage);
                    }
                });
                // hack? to get the initial 'page' to initialize after reloading or following a #link
                if (document.location.hash !== '') {
                    $.mobile.changePage(document.location.hash);
                }
            });
    
            /*
            var user = prompt('Username?'),
                pass = prompt('Password?');
            */
            /*
            app.authenticate().then(function(auth) {
                app.bz.call('Bug.add_comment', {
                    id: bug.id,
                    comment: 'Just testing Bugzilla tools (not the spammer)',
                    Bugzilla_login: auth.user,
                    Bugzilla_password: auth.pass
                }).then(function(result) {
                    $('#view').empty().text(JSON.stringify(result));
                }).fail(function() {
                    console.log('hit failed');
                });
            }).fail(function() {
                console.log('auth canceled');
            });
            */
        }
    };

})(jQuery);
