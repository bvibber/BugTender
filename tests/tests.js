test('Something basic', function() {
    ok(true, 'it is ok');
});

function MockBugzilla() {
    this.call = function(method, params) {
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
