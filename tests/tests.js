test('Something basic', function() {
    ok(true, 'it is ok');
});

function MockBugzilla() {
    var used = 0;
    this.call = function(method, params) {
        if (used) {
            throw new Error("MockBugzilla got called twice, expected only single call");
        }
        used = true;
        return $.Deferred(function(deferred) {
            setTimeout(function() {
                var bugs = {
                    1234: {id: 1234, summary: "one two three four"},
                    5678: {id: 5678, summary: "five six seven eight"}
                };
                var result = {
                    bugs: []
                };
                if ('ids' in params) {
                    $.each(params.ids, function(i, id) {
                        if (id in bugs) {
                            result.bugs.push(bugs[id]);
                        }
                    });
                }

                deferred.resolve(result);
            }, 50);
        }).promise();
    }
}

test('MockBugzilla call returns data', function() {
    var bz = new MockBugzilla();
    
    stop();
    bz.call('Bug.get', {ids: [1234]})
    .then(function(data) {
        start();
        ok(data, 'MockBugzilla call returned data');
        equals(typeof data, 'object', 'return data is an object');
        equals(typeof data.bugs[0], 'object', 'return data has elements');
    });
});

test('LocalStore empty get', function() {
    var bz = new MockBugzilla(),
        cache = new LocalStore(bz),
        id = 999;

    stop();
    cache.get('bug', id)
    .then(function(bugs) {
        start();
        equals(typeof bugs, 'object', 'return data is an object');
        deepEqual(bugs, {}, 'return data should be empty');
    });
});

test('LocalStore single get', function() {
    var bz = new MockBugzilla(),
        cache = new LocalStore(bz),
        id = 1234;

    stop();
    cache.get('bug', id)
    .then(function(bugs) {
        start();
        equals(typeof bugs, 'object', 'return data is an object');
        ok(id in bugs, 'expected id is in the return data');
        equals(typeof bugs[id], 'object','return data is an object');
        equals(bugs[id].id, id, 'id of bug matches its label');
        
        var count = 0;
        $.map(bugs, function() {
            count++;
        });
        equals(1, count, "no unexpected other elements");
    });
});

test('LocalStore double get', function() {
    var bz = new MockBugzilla(),
        cache = new LocalStore(bz),
        ids = [1234, 5678];

    stop();
    cache.get('bug', ids)
    .then(function(bugs) {
        start();
        equals(typeof bugs, 'object', 'return data is an object');
        $.each(ids, function(i, id) {
            ok(id in bugs, 'expected id is in the return data');
            equals(typeof bugs[id], 'object','return data is an object');
            equals(bugs[id].id, id, 'id of bug matches its label');
        });
        
        var count = 0;
        $.map(bugs, function() {
            count++;
        });
        equals(ids.length, count, "no unexpected other elements");
    });
});

test('LocalStore get twice', function() {
    var bz = new MockBugzilla(),
        cache = new LocalStore(bz),
        id = 1234;

    stop();
    cache.get('bug', id)
    .then(function(bugs) {
        start();
        equals(bugs[id].id, id, 'id of bug matches its label');
        
        stop();
        cache.get('bug', id)
        .then(function(bugs2) {
            start();
            deepEqual(bugs, bugs2, 'first and second hits match');
        });
    });
});

test('genericSorter', function() {
    equals(app.genericSorter(100, 100), 0, "100 == 100");
    equals(app.genericSorter(50, 50), 0, "50 == 50");
    equals(app.genericSorter(50, 100), -1, "50 < 100");
    equals(app.genericSorter(100, 50), 1, "100 > 50");
});

test('dateSorter', function() {
    var sooner = '2001-01-15T01:23:45Z',
        later = '2011-11-30T12:34:56Z';
    equals(app.dateSorter(sooner, sooner), 0, "sooner == sooner");
    equals(app.dateSorter(later, later), 0, "sooner == sooner");
    equals(app.dateSorter(sooner, later), -1, "sooner < later");
    equals(app.dateSorter(later, sooner), 1, "later > sooner");
});


test('commentLinks', function() {
    var data = [
        [
            'just some text',
            'just some text'
        ],
        [
            'some <b>scary html & stuff!</b>',
            'some &lt;b&gt;scary html &amp; stuff!&lt;/b&gt;'
        ],
        [
            'talk about bug 12345 and stuff',
            'talk about <a href="#bug12345">bug 12345</a> and stuff'
        ],
        [
            'talk about Bug 12345 and stuff',
            'talk about <a href="#bug12345">Bug 12345</a> and stuff'
        ],
        [
            'talk about bug 12345 and bug 5678 and stuff',
            'talk about <a href="#bug12345">bug 12345</a> and <a href="#bug5678">bug 5678</a> and stuff'
        ],
        [
            'some http://example.com/ links',
            'some <a href="http://example.com/">http://example.com/</a> links',
        ],
        [
            'some http://example.com/ links to http://the.web.com/',
            'some <a href="http://example.com/">http://example.com/</a> links to <a href="http://the.web.com/">http://the.web.com/</a>',
        ],
        [
            'an <http://example.com/> link in angle brackets',
            'an &lt;<a href="http://example.com/">http://example.com/</a>&gt; link in angle brackets',
        ]
    ];
    expect(data.length);
    
    for (var i = 0; i < data.length; i++) {
        equals(app.commentLinks(data[i][0]), data[i][1]);
    }

});
