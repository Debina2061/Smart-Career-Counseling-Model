import bcrypt from "bcrypt";

export const Encryption = (plainTextPassword)=>{
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(plainTextPassword,salt);
}

export const Decryption = (plainTextPassword,hashedPassword)=>{
    return bcrypt.compareSync(plainTextPassword,hashedPassword);
}