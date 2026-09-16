static ids: Map = Map {};
static files: Map = Map {};

export fn addFile(string name, string content) {
    let id = ids.get(name);
    if (id) return id;

    files.set(ids.size, { name, content });
    return ids.getOrInsert(name, ids.size);
}

export fn getSnippet(Span span) {
    let content = files.get(span.parent).content;
    if (content == undefined) return Error("the file the span refers to doesn't exist");

    let mut column = 0;
    let mut line = 0;
    let mut i = 0;
    while (i < span.start) {
        let c = content.at(i);
        if (c == '\n') {
            line = line + 1;
            column = 0;
        } else {
            column = column + 1;
        }

        i = i + 1;
    }

    return {
        column,
        line,
        value: content.slice(span.start, span.end),
    };
}

export fn getSource(Span span) {
    let source = files.get(span.parent);
    if (source == undefined) return Error("source does not exist");
    return source;
}

export fn getSourceId(string name) {
    let id = ids.get(name);
    if (id == undefined) return Error("source does not exist");
    return id;
}
