static ids: Map = Map {};
static files: Map = Map {};

export fn addFile(string name, string content) {
    let id = ids.get(name);
    if (id) return id;

    files.set(ids.size, { name, content });
    return ids.getOrInsert(name, ids.size);
}