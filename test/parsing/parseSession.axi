struct Module {
    code: Node,
    path: string,
}

export struct ParseSession {
    cwd: string,
    mainDir: string,
    modules: [Module],
}
