import React, { useState, useRef, useCallback } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack,
  CloudUpload,
  Create,
  CheckCircle,
  Description,
  Edit
} from '@mui/icons-material';
import { moodleAPI } from '../services/api';
import { CourseCategory, CourseCreateRequest } from '../types/content';

interface ModernContentCreatorProps {
  onBack: () => void;
  categories: CourseCategory[];
}

interface ImportedContent {
  title: string;
  summary: string;
  sections: Array<{
    name: string;
    summary: string;
    activities: Array<{
      type: string;
      name: string;
      content: string;
    }>;
  }>;
}

const ModernContentCreator: React.FC<ModernContentCreatorProps> = ({ onBack, categories }) => {
  const [step, setStep] = useState<'import' | 'customize' | 'create'>('import');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Import state
  const [importType, setImportType] = useState<'notion' | 'manual'>('notion');
  const [importedContent, setImportedContent] = useState<ImportedContent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Course creation state
  const [courseData, setCourseData] = useState<CourseCreateRequest>({
    fullname: '',
    shortname: '',
    categoryid: categories[0]?.id || 1,
    summary: '',
    summaryformat: 1,
    format: 'topics',
    visible: 1,
    startdate: Math.floor(Date.now() / 1000)
  });

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.md')) {
      setError('Please upload a Markdown (.md) file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        // Simple markdown content extraction
        const lines = content.split('\n');
        const title = lines[0]?.replace(/^#\s*/, '') || 'Untitled';
        const summary = lines.slice(1, 5).join(' ').substring(0, 200);

        const moodleContent = {
          title: title,
          summary: summary,
          sections: [{
            name: 'General',
            summary: '',
            activities: [{
              type: 'page',
              name: title,
              intro: content
            }]
          }]
        };

        setImportedContent(moodleContent);
        setCourseData(prev => ({
          ...prev,
          fullname: title,
          shortname: title.toLowerCase().replace(/\s+/g, '_').substring(0, 20),
          summary: summary
        }));

        setStep('customize');
        setError(null);
      } catch (err) {
        setError('Failed to parse Markdown file. Please check the format.');
        console.error('Markdown parsing error:', err);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleManualCreate = () => {
    setImportedContent({
      title: 'New Course',
      summary: 'Course created manually',
      sections: []
    });
    setStep('customize');
  };

  const handleCreateCourse = async () => {
    if (!importedContent) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create the course
      const courseResult = await moodleAPI.createCourse(courseData);

      if (!courseResult.id) {
        throw new Error('Failed to create course');
      }

      // Create sections and activities
      let createdActivities = 0;
      for (const section of importedContent.sections) {
        // Note: In a real implementation, you would need to create sections first
        // For now, we'll create activities in the default sections

        for (const activity of section.activities) {
          try {
            await moodleAPI.createActivity(courseResult.id, activity.type, {
              name: activity.name,
              intro: activity.content,
              introformat: 1
            });
            createdActivities++;
          } catch (activityError) {
            console.warn(`Failed to create activity: ${activity.name}`, activityError);
          }
        }
      }

      setSuccess(
        `Course "${courseData.fullname}" created successfully! ` +
        `Created ${createdActivities} activities from ${importedContent.sections.length} sections.`
      );
      setStep('create');

    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create course');
      console.error('Course creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('import');
    setImportedContent(null);
    setCourseData({
      fullname: '',
      shortname: '',
      categoryid: categories[0]?.id || 1,
      summary: '',
      summaryformat: 1,
      format: 'topics',
      visible: 1,
      startdate: Math.floor(Date.now() / 1000)
    });
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getActiveStep = () => {
    switch (step) {
      case 'import': return 0;
      case 'customize': return 1;
      case 'create': return 2;
      default: return 0;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={onBack}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            Create New Course
          </Typography>
        </Box>

        <Stepper activeStep={getActiveStep()} sx={{ mb: 3 }}>
          <Step>
            <StepLabel>Import Content</StepLabel>
          </Step>
          <Step>
            <StepLabel>Customize Course</StepLabel>
          </Step>
          <Step>
            <StepLabel>Create & Deploy</StepLabel>
          </Step>
        </Stepper>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {step === 'import' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Choose Import Method
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            How would you like to create your course?
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: importType === 'notion' ? 'primary.main' : 'grey.300',
                  '&:hover': { borderColor: 'primary.light' }
                }}
                onClick={() => setImportType('notion')}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Description sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Import from Notion
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload a Markdown file exported from Notion to automatically create course structure
                  </Typography>
                  {importType === 'notion' && (
                    <Chip label="Selected" color="primary" sx={{ mt: 2 }} />
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: importType === 'manual' ? 'primary.main' : 'grey.300',
                  '&:hover': { borderColor: 'primary.light' }
                }}
                onClick={() => setImportType('manual')}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Edit sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Create Manually
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start with a blank course and add content manually
                  </Typography>
                  {importType === 'manual' && (
                    <Chip label="Selected" color="primary" sx={{ mt: 2 }} />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            {importType === 'notion' ? (
              <Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="contained"
                  size="large"
                  startIcon={<CloudUpload />}
                  sx={{ mb: 2 }}
                >
                  Upload Markdown File
                </Button>
                <Typography variant="body2" color="text.secondary">
                  Export your Notion page as Markdown and upload it here.
                  We'll automatically create a course structure based on your content.
                </Typography>
              </Box>
            ) : (
              <Button
                onClick={handleManualCreate}
                variant="contained"
                size="large"
                startIcon={<Create />}
              >
                Start Creating
              </Button>
            )}
          </Box>
        </Paper>
      )}

      {step === 'customize' && importedContent && (
        <>
          <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Course Details
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Course Name"
                  value={courseData.fullname}
                  onChange={(e) => setCourseData(prev => ({ ...prev, fullname: e.target.value }))}
                  placeholder="Enter course name"
                  fullWidth
                  required
                />

                <TextField
                  label="Course Code"
                  value={courseData.shortname}
                  onChange={(e) => setCourseData(prev => ({ ...prev, shortname: e.target.value }))}
                  placeholder="Enter course code"
                  fullWidth
                  required
                />

                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={courseData.categoryid}
                    label="Category"
                    onChange={(e) => setCourseData(prev => ({ ...prev, categoryid: parseInt(String(e.target.value)) }))}
                  >
                    {categories.map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Description"
                  value={courseData.summary}
                  onChange={(e) => setCourseData(prev => ({ ...prev, summary: e.target.value }))}
                  multiline
                  rows={3}
                  placeholder="Enter course description"
                  fullWidth
                />
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Content Preview
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">
                          {importedContent.sections.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Sections
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">
                          {importedContent.sections.reduce((total, section) => total + section.activities.length, 0)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Activities
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {importedContent.sections.map((section, index) => (
                  <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {section.name}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {section.activities.map((activity, actIndex) => (
                          <Chip
                            key={actIndex}
                            label={`${activity.type}: ${activity.name}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            onClick={() => setStep('import')}
            variant="outlined"
            startIcon={<ArrowBack />}
          >
            Back to Import
          </Button>
          <Button
            onClick={handleCreateCourse}
            disabled={loading || !courseData.fullname || !courseData.shortname}
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <Create />}
          >
            {loading ? 'Creating...' : 'Create Course'}
          </Button>
        </Box>
        </>
      )}

      {step === 'create' && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main' }} />
            <Typography variant="h4" component="h2">
              Course Created Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Your course has been created and is ready for students.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                onClick={resetForm}
                variant="outlined"
                startIcon={<Create />}
              >
                Create Another Course
              </Button>
              <Button
                onClick={onBack}
                variant="contained"
                startIcon={<ArrowBack />}
              >
                View All Courses
              </Button>
            </Box>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default ModernContentCreator;