<template>
  <div v-if="ret" class="center-wrapper">
    <div v-if="!userPermissions.document.canRead">
      <h1>对不起，您没有该文档的阅读权限。</h1>
      <h1>Sorry, but you have no permission to read this document.</h1>
    </div>
    <div v-else>
      <div>
        <div
          v-if="dirty.lockOwner"
          style="background-color: coral; color: white"
        >请注意，该文档正在被{{this.dirty.lockOwner.username}}编辑，您看到的可能不是该文档的最新版本。</div>
        <div
          v-if="dirty.isDirty && !dirty.lockOwner"
          style="background-color: #42b983; color: white"
        >请注意，{{this.dirty.lastModifierName}}已于{{this.dirty.updatedAt | moment}}提交了该文档的最新版本，刷新页面以获得最新版本内容。</div>

        <div class="text-center">
          <div class="title-and-creator">
            <h1 class="doc-title">{{currentFile.title}}</h1>

            <span>by</span>
            <!-- <el-avatar class="creator-avatar" v-if="creator" :size="45" :src="creator.avatarUrl"></el-avatar> -->
            <el-link
              class="creator-link"
              v-if="creator"
              @click="jmp('/getUser/'+creator.id)"
            >{{creator.username}}</el-link>
          </div>
        </div>

        <div v-if="currentFile" class="doc-info">
          <span class="info-badge">创建时间: {{currentFile.createdAt | moment}}</span>
          <span class="info-badge">上次更新: {{currentFile.updatedAt | moment}}</span>
          <span class="info-badge">编辑次数: {{currentFile.modifyCount}}</span>
        </div>

        <div class="doc-actions">
          <!-- 编辑按钮 -->
          <el-button
            @click="jmp('/editFile/'+documentId)"
            type="primary"
            icon="el-icon-edit"
            circle
          ></el-button>
          <!-- 收藏按钮 -->
          <el-button type="warning" :icon="favorite.favoriteIcon" @click="favoriteFile" circle></el-button>

          <el-popover placement="bottom" width="400" trigger="click">
            <share :share-url="shareUrl"></share>
            <el-button
              class="action-btn"
              slot="reference"
              type="success"
              :disabled="!userPermissions.document.canShare"
            >分享文档</el-button>
          </el-popover>

          <el-button type="primary" @click="jmp('/createFile/'+documentId)">基于此模板</el-button>
          <!-- <el-button type="primary" @click="jmp('/docmange/'+documentId)">管理</el-button> -->
          <!-- 设置文档权限弹出框 -->
          <el-popover placement="right" trigger="click" v-model="visible">
            <div class="popup-set-permission" style="text-align: center; margin: 0">
              <set-doc-permission ref="setPermission" :isEditFile="true"></set-doc-permission>
              <el-button size="mini" type="warning" plain @click="visible = false">取消</el-button>
              <el-button type="primary" size="mini" @click="SetPermissionOnclick">确定</el-button>
            </div>
            <el-button
              class="action-btn"
              slot="reference"
              type="warning"
              :disabled="this.currentTeam.leaderId!=this.global.me.id&&this.global.me.id!=this.document.creatorId"
            >设置文档权限</el-button>
          </el-popover>
          <el-popover
            placement="right"
            trigger="click"
            v-if="this.global.me.id==this.document.creatorId"
          >
            <!-- 移动到团队的 popup -->
            <div class="popup-wrapper">
              <team-list
                :teamList="this.teamList"
                :document="this.document"
                :isMycreated="false"
                :isMoveDoc="true"
                :userId="this.global.me.id"
                :NeedShortName="true"
                @get-teamlist="loadTeamlist"
              ></team-list>
            </div>
            <el-button class="action-btn" slot="reference" type="warning">{{this.teamName}}</el-button>
          </el-popover>
          <el-button
            @click="deletefromteam(document)"
            type="danger"
            v-if="(this.document.teamId!=null)&&((this.global.me.id==this.document.creatorId)||(this.global.me.id==this.currentTeam.leaderId))"
          >移出团队</el-button>
          <!-- 当前文档所在团队名，点击可移动文档至团队 -->
        </div>
        <HR style="margin-top:2.5rem; margin-bottom:2.5rem;" />

        <!-- 正文 -->
        <h1 class="text-center">文档内容</h1>

        <div id="doc-content" class="flex-center">
          <div class="real-content" v-html="currentFile.data"></div>
        </div>

        <div id="comment-big-box">
          <h1 class="text-center">评论列表</h1>
          <div id="comment-list-box">
            <!-- TODO refresh?? -->
            <div :key="refreshCommentKey">
              <div v-for="item in comments" :key="item.id">
                <comment-card :comment="item"></comment-card>
              </div>
            </div>
          </div>
        </div>
        <HR />
        <create-comment ref="createComment" :documentId="documentId" @submit-comment="loadComments"></create-comment>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import CreateComment from "../components/CreateComment";
import Share from "../components/Share";
import TeamList from "@/components/TeamList.vue";
import SetDocPermission from "@/components/SetDocPermission.vue";
import CommentCard from "@/components/CommentCard";

export default {
  name: "ReadFile",
  components: {
    Share,
    CreateComment,
    TeamList,
    SetDocPermission,
    CommentCard,
  },
  created() {
    this.documentId = this.$route.params.id;

    //先检查文档阅读权限
    axios
      .get("/api/documents/permission/" + this.documentId)
      .then((response) => {
        console.log(response);
        this.userPermissions.ref = response.data;

        // 解析权限
        //      文档读写
        if (this.userPermissions.ref.documentAccess == "ReadWrite") {
          this.userPermissions.document.canWrite = true;
          this.userPermissions.document.canRead = true;
        } else if (this.userPermissions.ref.documentAccess == "Read") {
          this.userPermissions.document.canRead = true;
        }
        //      文档分享
        if (this.userPermissions.ref.canShare) {
          this.userPermissions.document.canShare = true;
        }
        //      评论读写
        if (this.userPermissions.ref.commentAccess == "ReadWrite") {
          this.userPermissions.comment.canWrite = true;
          this.userPermissions.comment.canRead = true;
        } else if (this.userPermissions.ref.commentAccess == "Read") {
          this.userPermissions.comment.canRead = true;
        }

        // 有权限读
        if (this.userPermissions.document.canRead) {
          axios
            .get("/api/documents/" + this.documentId)
            .then((response) => {
              console.log(response);
              this.currentFile = response.data;

              axios
                .get("/api/users/" + this.currentFile.creatorId)
                .then((res) => {
                  this.creator = res.data;
                })
                .catch((p) => this.err(p));
            })
            .catch(function (error) {
              console.log(error);
            });
          this.checkFavorite(); // 检查是否收藏过，如果收藏过则显示已收藏
          this.loadComments(); // 加载评论
          this.shareUrl = window.location.href;
          this.ret = true;

          // 计数器，获取该文档的写状态
          this.timer = setInterval(() => {
            // this.testCount=this.testCount+1;
            // alert("hello");
            axios
              .get("/api/e-lock/get-owner?documentId=" + this.documentId)
              .then((response) => {
                console.log(response);
                this.dirty.lockOwner = response.data;
                if (this.dirty.lockOwner) {
                  // 写锁有主
                  this.dirty.isDirty = true;
                  this.dirty.lastModifierName = this.dirty.lockOwner.username;
                } else {
                  // 写锁有主
                  if (this.dirty.isDirty) {
                    // 已脏
                    axios
                      .get("/api/documents/" + this.documentId)
                      .then((response) => {
                        // window.console.log(response.data.length);
                        console.log(response);
                        this.dirty.updatedAt = response.data.updatedAt;

                        // alert("请求成功")
                      })
                      .catch(function (error) {
                        console.log(error);
                      });
                  }
                }
              })
              .catch((error) => {
                console.log(error);
                this.err("获取写锁失败");
              });
          }, 1000);
        }
        this.ret = true;
      })
      .catch((error) => {
        console.log(error);
      });

    axios
      .get("/api/memberships", { params: { userId: this.global.me.id } })
      .then((response) => {
        this.teamList = response.data;
      })
      .catch((error) => {
        console.log(error);
        this.err(error);
      });
    axios
      .get("/api/documents/" + this.documentId)
      .then((response) => {
        this.document = response.data;
        if (
          this.document.teamId != null &&
          this.document.teamId != 0 &&
          this.document.teamId != -1
        ) {
          this.$axios
            .get("/api/teams/" + this.document.teamId)
            .then((response) => {
              this.currentTeam = response.data;
              this.teamName = response.data.name;
            })
            .catch((error) => {
              console.log(error);
              this.err(error);
            });
        } else {
          this.teamName = "暂无团队";
        }
      })
      .catch((error) => {
        console.log(error);
        this.err(error);
      });
  },
  destroyed() {
    if (this.timer) clearInterval(this.timer);
  },
  data() {
    return {
      visible: false,
      currentTeam: "",
      teamName: "",
      documentId: null,
      document: "",
      teamList: [],
      favorite: {
        favorited: false,
        favoriteId: "",
        favoriteIcon: "el-icon-star-off",
        icons: ["el-icon-star-off", "el-icon-star-on"], // 未收藏 | 已收藏
      },
      currentFile: {},
      comments: [],
      shareUrl: "",
      ret: false,
      dirty: {
        isDirty: false,
        lockOwner: null,
        lastModifierName: "",
        updatedAt: 0,
      },
      userPermissions: {
        ref: null,
        document: {
          canRead: false,
          canWrite: false,
          canShare: false,
        },
        comment: {
          canRead: false,
          canWrite: false,
        },
      },
      refreshCommentKey: 0,
      creator: null,
    };
  },
  methods: {
    SetPermissionOnclick() {
      this.$refs.setPermission.submit();
      this.visible = false;
    },
    loadTeamlist() {
      this.teamName = "暂无团队";
      axios
        .get("/api/memberships", { params: { userId: this.global.me.id } })
        .then((response) => {
          this.teamList = response.data;
        })
        .catch((error) => {
          console.log(error);
          this.err(error);
        });
      axios
        .get("/api/documents/" + this.documentId)
        .then((response) => {
          this.document = response.data;
          if (this.document.teamId != null && this.document.teamId != 0) {
            this.$axios
              .get("/api/teams/" + this.document.teamId)
              .then((response) => {
                this.currentTeam = response.data;
                this.teamName = response.data.name;
                this.$refs.setPermission.loadData();
              })
              .catch((error) => {
                console.log(error);
                this.err(error);
              });
          } else {
            this.teamName = "暂无团队";
          }
        })
        .catch((error) => {
          console.log(error);
          this.err(error);
        });
    },
    deletefromteam(document) {
      this.teamId = -1;
      this.documentId = document.id;
      this.$axios
        .patch("/api/documents/" + this.documentId, {
          teamId: this.teamId,
        })
        .then((response) => {
          this.success("成功将文档移除团队");
          console.log(response.data);
          this.loadTeamlist();
          this.teamName = "暂无团队";
          this.$refs.setPermission.loadData();
          this.document.teamId = null;
        })
        .catch((p) => this.err(p));
    },
    checkFavorite() {
      axios
        .get("/api/favorites/find-by-documentId/?documentId=" + this.documentId)
        .then((response) => {
          console.log(response);
          if (response.data == "") {
            // alert("123444336");
            this.favorite.favorited = false;
            this.favorite.favoriteIcon = this.favorite.icons[0];
          } else {
            // 收藏过
            this.favorite.favorited = true;
            this.favorite.favoriteIcon = this.favorite.icons[1];
            this.favorite.favoriteId = response.data.id;
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
    favoriteFile() {
      // 收藏操作
      if (this.favorite.favorited == false) {
        // 未收藏过，执行收藏
        axios
          .post("/api/favorites?documentId=" + this.currentFile.id)
          .then((response) => {
            console.log(response);
            // 变更状态为已收藏
            this.favorite.favorited = true;
            this.favorite.favoriteIcon = this.favorite.icons[1];
            this.favorite.favoriteId = response.data.id;
          })
          .catch((error) => {
            console.log(error);
          });
      } else {
        // 已收藏过，取消收藏
        axios
          .delete("/api/favorites/" + this.favorite.favoriteId)
          .then((response) => {
            console.log(response);
            // 变更状态为未收藏
            this.favorite.favorited = false;
            this.favorite.favoriteIcon = this.favorite.icons[0];
            this.favorite.favoriteId = "";
          })
          .catch((error) => {
            console.log(error);
          });
      }
    },
    loadComments() {
      axios
        .get("/api/comments?documentId=" + this.documentId)
        .then((response) => {
          console.log(response);
          this.comments = response.data;
          // 初始化编辑器
          if (this.$refs.createComment.$refs.thisEditor.editor) {
            this.$refs.createComment.$refs.thisEditor.clearEditor();
          }
          this.refreshCommentKey = this.refreshCommentKey + 1;
        })
        .catch(function (error) {
          console.log(error);
        });
    },
    // gotoEditFile() {
    //     this.$router.push({path: "/editFile/"+this.documentId})
    // },
  },
};
</script>

<style scoped>
.el-row {
  margin-bottom: 20px;
  &:last-child {
    margin-bottom: 0;
  }
}
.el-col {
  border-radius: 4px;
}
.bg-purple-dark {
  background: #99a9bf;
}
.bg-purple {
  background: #d3dce6;
}
.bg-purple-light {
  background: #e5e9f2;
}

.row-bg {
  padding: 10px 0;
  background-color: #f9fafc;
}

#doc-content {
  /*border-style: dashed;*/
  box-shadow: 0px 0px 15px 0px gray;
  border-width: 2px;
  /*border-radius: 30px;*/
  border-color: #dcdfe6;
  padding: 30px 80px;
  word-break: break-word;
  min-height: 450px;
  background-color: #fbfbfb;
  /*background-color: whitesmoke;*/
}

.real-content{
  width: 100%;
  justify-content: unset;
}

#comment-big-box {
  margin: 60px 0;
}

#comment-list-box {
  border-style: dashed;
  border-width: 2px;
  border-radius: 15px;
  border-color: #dcdfe6;
  padding: 15px 15px;
}

/* .comment-user-info {
  display: flex;
  align-items: center;
  background-color: lightblue;
  width: fit-content;
  padding: 8px 25px;
  border-radius: 4px;
} */

.title-and-creator {
  display: flex;
  justify-content: center;
  align-items: center;
}

.doc-title {
  margin-right: 30px;
}

.creator-avatar {
  margin-right: 8px;
  margin-left: 8px;
}

.doc-actions {
  margin: 14px;
}

.action-btn {
  margin: 0 5px;
}

.creator-link {
  margin-left: 5px;
}

.info-badge {
  margin: 10px;
  border-style: solid;
  border-width: 2px;
  border-radius: 4px;
  padding: 5px;
}

.popup-wrapper {
  height: 300px;
  overflow-y: auto;
}
</style>