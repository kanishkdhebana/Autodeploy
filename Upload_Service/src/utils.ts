export function generate(): string {
    const subset = "1234567890abcdefghijklmnopqrstuvwxyz" ;
    let ans = "" ;

    while (ans.length < 5) {
        const char = subset[Math.floor(Math.random() * subset.length)] ;
        ans += char ;
    }

    if (["utils"].includes(ans.toLowerCase())) {
        return generate() ;
    }

    return ans ;
}
