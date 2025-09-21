<!DOCTYPE html>
<html lang="en" data-dir="ltr" data-theme="light">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>[[modules:composer.compose]]</title>
	<link rel="stylesheet" href="{relative_path}/assets/client.css?v={cache-buster}">
</head>
<body class="compose-page">
	<div class="container-fluid">
		<div class="row">
			<div class="col-12">
				<div class="card">
					<div class="card-header">
						<h4 class="card-title mb-0">
							<!-- IF tid -->
								[[topic:composer.replying-to, "{title}"]]
							<!-- ELSE -->
								[[topic:composer.new-topic]]
							<!-- ENDIF tid -->
						</h4>
					</div>
					<div class="card-body">
						<form method="post" action="{config.relative_path}/compose" enctype="multipart/form-data">
							<input type="hidden" name="_csrf" value="{config.csrf_token}" />
							<!-- IF tid -->
								<input type="hidden" name="tid" value="{tid}" />
							<!-- ELSE -->
								<input type="hidden" name="cid" value="{cid}" />
							<!-- ENDIF tid -->

							<!-- IF !tid -->
							<div class="mb-3">
								<label for="title" class="form-label">[[topic:title]]</label>
								<input type="text" class="form-control" id="title" name="title" required>
							</div>
							<!-- ENDIF !tid -->

							<div class="mb-3">
								<label for="content" class="form-label">[[topic:content]]</label>
								<textarea class="form-control" id="content" name="content" rows="10" required placeholder="[[modules:composer.textarea.placeholder]]"></textarea>
							</div>

							<div class="mb-3">
								<div class="form-check form-switch">
									<input class="form-check-input" type="checkbox" id="anonymous" name="anonymous" value="1">
									<label class="form-check-label" for="anonymous">
										<i class="fa fa-question-circle text-muted" data-toggle="tooltip" data-placement="top" title="[[topic:anonymous-posting-help]]"></i>
										[[topic:post-anonymously]]
									</label>
								</div>
							</div>


							<div class="d-flex justify-content-between">
								<a href="javascript:history.back()" class="btn btn-secondary">[[global:buttons.cancel]]</a>
								<button type="submit" class="btn btn-primary">
									<!-- IF tid -->
										[[topic:post-reply]]
									<!-- ELSE -->
										[[topic:composer.submit]]
									<!-- ENDIF tid -->
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	</div>

	<script src="{relative_path}/assets/client.js?v={cache-buster}"></script>
</body>
</html>