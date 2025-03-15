const bcrypt = require('bcrypt');

const senhaFornecida = "112233"; // Troque por qualquer senha que você testou
const senhaArmazenada = "$2b$12$QccpvS7VcDJWHlKwIpPgTuJipjUNWsGQyENv3oNl4XOUKvO5hvrZG"; // Seu hash

bcrypt.compare(senhaFornecida, senhaArmazenada)
  .then(result => console.log("A senha é válida?", result))
  .catch(err => console.error("Erro ao comparar:", err));
