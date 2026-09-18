function Error(msg) {
    throw msg;
}
const Option = { Some: 0, None: 1 };
function main(args) {
    const result = Option.None;
    const maow = (() => {
        if (result === Some) return 'Hello';
        if (result === None) return 'World';
    })();
    console.log(maow);
}
main(process.argv);
