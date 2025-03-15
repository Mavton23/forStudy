require('dotenv').config()

const express = require('express')
const router = express.Router()
const { User, UserHistory } = require('../models/Model')
const { passport, checkLogin } = require('../configs/passport')
const bcrypt = require('bcrypt')
const { body, validationResult } = require('express-validator')


router.get('/register', (req, res) => {
    res.render('register', { title: "forStudy | Signup", })
})

router.post(
    '/register',
[
body('username').trim().notEmpty().withMessage('O nome de usuário é obrigatório!'),
body('email')
    .trim()
    .isEmail()
    .withMessage('Forneça um endereço de e-mail válido!'),
body('password')
    .trim()
    .isLength({ min: 6 })
    .withMessage('A senha deve ter pelo menos 6 caracteres!'),
body('confpass')
    .trim()
    .custom((value, { req }) => value === req.body.password)
    .withMessage('As senhas não coincidem!'),
],
async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.render('register', {
            error: errors.array().map(err => err.msg).join('<br>'),
        })
    }

    const { username, email, password } = req.body;

    try {
        const checkUser = await User.findOne({ where: { email } })
        if (checkUser) {
            return res.render('register', { error: 'E-mail já registrado.' });
        }

        const newUser = await User.create({
            username,
            email,
            password,
          });

          req.logIn(newUser, (err) => {
            if (err) {
              console.error(err);
              return res.render('register', { error: 'Erro ao autenticar o usuário, tente novamente.' });
            }
            req.session.userId = newUser.id; // Salvar o ID do usuário na sessão
            return res.redirect('/?logged=true');
          });
    } catch (error) {
        console.error(error);
      return res.render('register', { error: 'Erro ao registrar o usuário, tente novamente.' });
    }
})

router.get('/login', (req, res) => {
    res.render('login', { title: "forStudy | Signin" })
})

router.post(
    '/login',
    [
      // Validações antes da autenticação
      body('email').trim().isEmail().withMessage('Forneça um e-mail válido!'),
      body('password').trim().notEmpty().withMessage('A senha é obrigatória!'),
    ],
    (req, res, next) => {
      const errors = validationResult(req);
  
      // Verificar erros de validação
      if (!errors.isEmpty()) {
        return res.render('login', {
          error: errors.array().map(err => err.msg).join('<br>'),
        });
      }
  
      // Processar autenticação com Passport.js
      passport.authenticate('local', (err, user, info) => {
        if (err) {
          console.error('Erro de autenticação:', err);
          return next(err);
        }
        if (!user) {
          return res.render('login', {
            error: info?.message || 'Credenciais inválidas. Tente novamente!',
          });
        }
        req.logIn(user, (err) => {
          if (err) {
            console.error('Erro ao logar o usuário:', err);
            return next(err);
          }
          req.session.userId = user.id;
          const returnTo = req.session.returnTo || '/?logged=true';
          delete req.session.returnTo;
          return res.redirect(returnTo);
        });
      })(req, res, next);
    }
  );

// Profile (update, delete history, delete account)
// Rota para exibir o perfil do usuário
router.get('/:userId/profile', checkLogin, async (req, res) => {
  try {
    const { userId } = req.params
    let user = null

    if (userId) {
      const checkuser = await User.findByPk(userId)
      user = checkuser ? checkuser.toJSON() : null
    }

    return res.render('profile', { user, title: "forStudy | Profile" })
  } catch (error) {
    console.error("Erro ao acessar o perfil: ", error instanceof Error ? error.message : error)
  }
  
});

// Rota para alterar a senha
router.post('/profile/change-password', checkLogin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.session.userId;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Preencha todos os campos.' });
  }

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });
    }

    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await User.update(
      { password: hashedNewPassword },
      { where: { id: userId } }
    );

    res.json({ success: true, message: 'Senha alterada com sucesso!' });

  } catch (error) {
    console.error("Erro ao mudar a senha:", error);
    res.status(500).json({ success: false, message: 'Erro ao alterar a senha.' });
  }
});

// Rota para eliminar o histórico
router.post('/profile/delete-history', checkLogin, async (req, res) => {
  const userId = req.session.userId
  let user = null

  if (userId) {
    const checkuser = await User.findByPk(userId)
    user = checkuser ? checkuser.toJSON() : null
  }

  try {
      // Lógica para eliminar a conta do usuário
      if (!user) {
        throw new Error('Usuário não encontrado.');
      }

    await UserHistory.destroy({
      where: { userId: userId }
    });

    res.json({ success: true, message: 'Histórico eliminado com sucesso!' });

  } catch (error) {
    console.error("Erro ao excluir historico: ", error instanceof Error ? error.message : error)  
    res.status(500).json({ success: false, message: 'Erro ao eliminar o histórico.' });
  }
});

// Rota para eliminar a conta
router.post('/profile/delete-account', checkLogin, async (req, res) => {
  const userId = req.session.userId
  let user = null

  if (userId) {
    const checkuser = await User.findByPk(userId)
    user = checkuser ? checkuser.toJSON() : null
  }

  try {
      // Lógica para eliminar a conta do usuário
      if (!user) {
        throw new Error('Usuário não encontrado.');
      }

      await User.destroy({
        where: { id: userId }
      })

      req.session.destroy((err) => {
        if (err) {
            console.error("Erro ao encerrar a sessão: ", err);
            throw new Error('Erro ao encerrar a sessão.');
        }
    });
    res.json({ 
      success: true, 
      message: 'Conta eliminada com sucesso!',
      redirectTo: '/'
  });

  } catch (error) {
    console.error("Erro ao excluir a conta: ", error instanceof Error ? error.message : error)  
    res.status(500).json({ success: false, message: 'Erro ao eliminar a conta.' });
  }
});


// Logout
router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/')
    })
})

module.exports = router