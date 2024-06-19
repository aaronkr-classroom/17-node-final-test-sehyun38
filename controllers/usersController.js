// controllers/usersController.js
"use strict";

const passport = require("passport"),
  User = require("../models/User"); // 사용자 모델 요청

const getUserParams = (body) => {
  return {
    username: body.username,
    name: {
      first: body.first,
      last: body.last,
    },
    email: body.email,
    password: body.password,
    profileImg: body.profileImg,
  };
};

module.exports = {
  /**
   * =====================================================================
   * User Authentication / 사용자 인증
   * =====================================================================
   */
  login: (req, res) => {
    res.render("users/login", {
      page: "login",
      title: "Login",
    });
  },

  authenticate: passport.authenticate("local", {
    // 성공, 실패의 플래시 메시지를 설정하고 사용자의 인중 상태에 따라 리디렉션할 경로를 지정한다
    failureRedirect: "/users/login",
    failureFlash: "Failed to login.",
    successReturnToOrRedirect: "/",
    successFlash: "Logged in!",
  }), // passport의 authenticate 메소드를 사용해 사용자 인증

  logout: (req, res, next) => {
    req.logout(() => {
      console.log("Logged out!");
    }); // passport의 logout 메소드를 사용해 사용자 로그아웃
    req.flash("success", "You have been logged out!"); // 로그아웃 성공 메시지
    res.locals.redirect = "/"; // 홈페이지로 리디렉션
    next();
  },

  redirectView: (req, res, next) => {
    let redirectPath = res.locals.redirect;
    if (redirectPath) res.redirect(redirectPath);
    else next();
  },

  /**
   * =====================================================================
   * C: CREATE / 생성
   * =====================================================================
   */
  new: (req, res) => {
    res.render("users/new", {
      page: "new-user",
      title: "New User",
    });
  },

  validate: (req, res, next) => {
    // 사용자가 입력한 이메일 주소가 유효한지 확인
    req
      .sanitizeBody("email")
      .normalizeEmail({
        all_lowercase: true,
      })
      .trim(); // trim()으로 whitespace 제거
    req.check("email", "Email is invalid").isEmail();
    req.check("password", "Password cannot be empty").notEmpty(); // password 필드 유효성 체크

    // 사용자가 입력한 비밀번호가 일치하는지 확인
    req.getValidationResult().then((error) => {
      // 앞에서의 유효성 체크 결과 수집
      if (!error.isEmpty()) {
        let messages = error.array().map((e) => e.msg);
        req.skip = true; // skip 속성을 true로 설정
        req.flash("error", messages.join(" and ")); // 에러 플래시 메시지로 추가
        res.locals.redirect = "/users/new"; // new 뷰로 리디렉션 설정
        next();
      } else {
        next(); // 다음 미들웨어 함수 호출
      }
    });
  },

  create: (req, res, next) => {
    if (req.skip) next(); // 유효성 체크를 통과하지 못하면 다음 미들웨어 함수로 전달

    let newUser = new User(getUserParams(req.body)); // Listing 22.3 (p. 328)

    User.register(newUser, req.body.password, (error, user) => {
      // 새로운 사용자 등록
      if (user) {
        // 새로운 사용자가 등록되면
        req.flash(
          "success",
          `${user.fullName}'s account created successfully!`
        ); // 플래시 메시지를 추가하고
        res.locals.redirect = "/users"; // 사용자 인덱스 페이지로 리디렉션
        next();
      } else {
        // 새로운 사용자가 등록되지 않으면
        req.flash(
          "error",
          `Failed to create user account because: ${error.message}.`
        ); // 에러 메시지를 추가하고
        res.locals.redirect = "/users/new"; // 사용자 생성 페이지로 리디렉션
        next();
      }
    });
  },

  /**
   * =====================================================================
   * R: READ / 조회
   * =====================================================================
   */

  /**
   * ------------------------------------
   * ALL records / 모든 레코드
   * ------------------------------------
   */
  index: (req, res, next) => {
    User.find() // index 액션에서만 퀴리 실행
      .exec()
      .then((users) => {
        // 사용자 배열로 index 페이지 렌더링
        res.locals.users = users; // 응답상에서 사용자 데이터를 저장하고 다음 미들웨어 함수 호출
        next();
      })
      .catch((error) => {
        // 로그 메시지를 출력하고 홈페이지로 리디렉션
        console.log(`Error fetching users: ${error.message}`);
        next(error); // 에러를 캐치하고 다음 미들웨어로 전달
      });
  },

  indexView: (req, res) => {
    res.render("users/index", {
      page: "users",
      title: "All Users",
    }); // 분리된 액션으로 뷰 렌더링
  },

  /**
   * ------------------------------------
   * SINGLE record / 단일 레코드
   * ------------------------------------
   */
  show: (req, res, next) => {
    let userId = req.params.id; // request params로부터 사용자 ID 수집
    User.findById(userId) // ID로 사용자 찾기
      .then((user) => {
        res.locals.user = user; // 응답 객체를 통해 다음 믿들웨어 함수로 사용자 전달
        next();
      })
      .catch((error) => {
        console.log(`Error fetching user by ID: ${error.message}`);
        next(error); // 에러를 로깅하고 다음 함수로 전달
      });
  },

  showView: (req, res) => {
    res.render("users/show", {
      page: "user-details",
      title: "User Details",
    });
  },

  /**
   * =====================================================================
   * U: UPDATE / 수정
   * =====================================================================
   */
  edit: (req, res, next) => {
    let userId = req.params.id;
    User.findById(userId) // ID로 데이터베이스에서 사용자를 찾기 위한 findById 사용
      .then((user) => {
        res.render("users/edit", {
          user: user,
          page: "edit-user",
          title: "Edit User",
        }); // 데이터베이스에서 내 특정 사용자를 위한 편집 페이지 렌더링
      })
      .catch((error) => {
        console.log(`Error fetching user by ID: ${error.message}`);
        next(error);
      });
  },

  update: (req, res, next) => {
    let userId = req.params.id,
      userParams = getUserParams(req.body);

    User.findByIdAndUpdate(userId, {
      $set: userParams,
    }) //ID로 사용자를 찾아 단일 명령으로 레코드를 수정하기 위한 findByIdAndUpdate의 사용
      .then((user) => {
        res.locals.redirect = `/users/${userId}`;
        res.locals.user = user;
        next(); // 지역 변수로서 응답하기 위해 사용자를 추가하고 다음 미들웨어 함수 호출
      })
      .catch((error) => {
        console.log(`Error updating user by ID: ${error.message}`);
        next(error);
      });
  },

  /**
   * =====================================================================
   * D: DELETE / 삭제
   * =====================================================================
   */
  delete: (req, res, next) => {
    let userId = req.params.id;
    User.findByIdAndRemove(userId) // findByIdAndRemove 메소드를 이용한 사용자 삭제
      .then(() => {
        res.locals.redirect = "/users";
        next();
      })
      .catch((error) => {
        console.log(`Error deleting user by ID: ${error.message}`);
        next();
      });
  },
};
