package main

import (
	"fmt"

	adapter "github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/config"
	lr "github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/models"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

func main() {
	fmt.Println("running migrations...")

	appConf := config.FromEnv()

	logger := lr.NewConsole(true)
	db, err := adapter.New(&appConf.Db)

	if err != nil {
		logger.Fatal().Err(err).Msg("")
		return
	}

	err = db.AutoMigrate(
		&models.Project{},
		&models.Role{},
		&models.User{},
		&models.Release{},
		&models.Session{},
		&models.GitRepo{},
		&models.Registry{},
		&models.HelmRepo{},
		&models.Cluster{},
		&models.ClusterCandidate{},
		&models.ClusterResolver{},
		&models.Infra{},
		&models.GitActionConfig{},
		&models.Invite{},
		&ints.KubeIntegration{},
		&ints.BasicIntegration{},
		&ints.OIDCIntegration{},
		&ints.OAuthIntegration{},
		&ints.GCPIntegration{},
		&ints.AWSIntegration{},
		&ints.TokenCache{},
		&ints.ClusterTokenCache{},
		&ints.RegTokenCache{},
		&ints.HelmRepoTokenCache{},
	)

	if err != nil {
		panic(err)
	}
}
