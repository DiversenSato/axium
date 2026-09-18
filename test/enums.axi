enum Option {
    Some(i32),
    None,
}

fn main([string] args) {
    let result: Option = None;

    let maow = match (result) {
        Some => "Hello",
        None => "World",
    };

    console.log(maow);
}
