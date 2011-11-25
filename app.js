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
            bz.call('Bug.add_comment', {
                id: bug.id,
                comment: 'Just testing Bugzilla tools',
                Bugzilla_login: user,
                Bugzilla_password: pass
            }).then(function(result) {
                $('#view').empty().text(JSON.stringify(result));
            });
            */
            $.mobile.changePage('#auth-dialog', {
                role: 'dialog'
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
