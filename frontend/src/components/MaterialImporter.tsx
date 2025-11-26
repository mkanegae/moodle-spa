import React, { useState, useRef, useEffect } from 'react';
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
  Chip,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  CloudUpload,
  AttachFile,
  Create,
  CheckCircle,
  Description,
  Edit,
  Delete
} from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import { bffAPI } from '../services/bffApi';
import { Course } from '../types/course';

interface MaterialImporterProps {
  onBack: () => void;
}

interface MaterialData {
  type: 'page' | 'file' | 'assignment' | 'quiz';
  title: string;
  content: string;
  files?: File[];
  courseId?: number;
  sectionId?: number;
}

interface ImportPreview {
  title: string;
  type: string;
  content: string;
  hasFiles: boolean;
  fileCount: number;
}

const MaterialImporter: React.FC<MaterialImporterProps> = ({ onBack }) => {
  const [step, setStep] = useState<'select' | 'import' | 'configure' | 'create'>('select');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [importType, setImportType] = useState<'notion' | 'files' | 'manual'>('notion');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Import data
  const [materialData, setMaterialData] = useState<MaterialData>({
    type: 'page',
    title: '',
    content: '',
    files: []
  });
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const coursesData = await bffAPI.getCourses();
      setCourses(coursesData);
    } catch (err) {
      setError('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setMaterialData(prev => ({ ...prev, courseId: course.id }));
    setStep('import');
  };

  const handleNotionImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.endsWith('.md')) {
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

        setMaterialData(prev => ({
          ...prev,
          title: title,
          content: content,
          type: 'page'
        }));

        setImportPreview({
          title: title,
          type: 'Page',
          content: content,
          hasFiles: false,
          fileCount: 0
        });

        setStep('configure');
        setError(null);
      } catch (err) {
        setError('Failed to parse Markdown file');
        console.error('Markdown parsing error:', err);
      }
    };
    reader.readAsText(file);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setAttachedFiles(files);
    setMaterialData(prev => ({
      ...prev,
      title: files[0].name.replace(/\.[^/.]+$/, ''), // Remove extension
      content: `<p>Uploaded ${files.length} file(s):</p><ul>${files.map(f => `<li>${f.name}</li>`).join('')}</ul>`,
      type: 'file',
      files
    }));

    setImportPreview({
      title: files[0].name.replace(/\.[^/.]+$/, ''),
      type: 'File Resource',
      content: `Files: ${files.map(f => f.name).join(', ')}`,
      hasFiles: true,
      fileCount: files.length
    });

    setStep('configure');
    setError(null);
  };

  const handleManualCreate = () => {
    setMaterialData({
      type: 'page',
      title: '',
      content: '',
      files: []
    });
    setStep('configure');
  };

  const handleAttachmentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    setMaterialData(prev => ({
      ...prev,
      files: [...(prev.files || []), ...files]
    }));
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    setMaterialData(prev => ({
      ...prev,
      files: prev.files?.filter((_, i) => i !== index) || []
    }));
  };

  const handleCreateMaterial = async () => {
    if (!selectedCourse || !materialData.title) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Upload files first if any
      const uploadedFiles = [];
      if (materialData.files && materialData.files.length > 0) {
        console.log('Uploading', materialData.files.length, 'files to course', selectedCourse.id);

        for (const file of materialData.files) {
          try {
            console.log('Uploading file:', file.name, 'size:', file.size);
            const uploadResult = await bffAPI.uploadFile(file, selectedCourse.id);

            if (uploadResult && !uploadResult.errorcode) {
              uploadedFiles.push(uploadResult);
              console.log('Successfully uploaded:', file.name);
            } else {
              console.error('Upload failed for file:', file.name, uploadResult);
              setError(`Failed to upload file: ${file.name}. ${uploadResult?.message || 'Unknown error'}`);
              return; // エラーがあった場合は処理を中止
            }
          } catch (uploadError: any) {
            console.error('Failed to upload file:', file.name, uploadError);

            // 具体的なエラーメッセージを表示
            if (uploadError.message) {
              setError(`File upload failed for "${file.name}": ${uploadError.message}`);
            } else {
              setError(`Failed to upload file: ${file.name}. Please check file size and permissions.`);
            }
            return; // エラーがあった場合は処理を中止
          }
        }

        console.log('All files uploaded successfully:', uploadedFiles.length);
      }

      // Create the activity/resource
      const activityData: any = {
        name: materialData.title,
        intro: materialData.content,
        introformat: 1,
        section: 0, // Default section
        visible: 1
      };

      // Add file references if uploaded
      if (uploadedFiles.length > 0) {
        activityData.files = uploadedFiles;
      }

      await bffAPI.createActivity(
        selectedCourse.id,
        materialData.type === 'file' ? 'resource' : materialData.type,
        activityData
      );

      setSuccess(
        `Material "${materialData.title}" added to course "${selectedCourse.fullname}" successfully!` +
        (uploadedFiles.length > 0 ? ` Uploaded ${uploadedFiles.length} files.` : '')
      );
      setStep('create');

    } catch (err: any) {
      console.error('Material creation error:', err);

      // Moodle特有のエラーメッセージを処理
      let errorMessage = 'Failed to create material';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        if (err.message.includes('invalidrecordunknown')) {
          errorMessage = 'Course or section not found. Please refresh the page and try again.';
        } else if (err.message.includes('Course or section not found')) {
          errorMessage = err.message;
        } else if (err.message.includes('Permission denied')) {
          errorMessage = 'You do not have permission to add content to this course.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('select');
    setSelectedCourse(null);
    setMaterialData({
      type: 'page',
      title: '',
      content: '',
      files: []
    });
    setImportPreview(null);
    setAttachedFiles([]);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const getActiveStep = () => {
    switch (step) {
      case 'select': return 0;
      case 'import': return 1;
      case 'configure': return 2;
      case 'create': return 3;
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
            Import Teaching Materials
          </Typography>
        </Box>

        <Stepper activeStep={getActiveStep()} sx={{ mb: 3 }}>
          <Step>
            <StepLabel>Select Course</StepLabel>
          </Step>
          <Step>
            <StepLabel>Import Method</StepLabel>
          </Step>
          <Step>
            <StepLabel>Configure Material</StepLabel>
          </Step>
          <Step>
            <StepLabel>Complete</StepLabel>
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

      {step === 'select' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Select Target Course
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Choose the course where you want to add the teaching material
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {courses.map(course => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={course.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                      }
                    }}
                    onClick={() => handleCourseSelect(course)}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {course.fullname}
                      </Typography>
                      <Chip label={course.shortname} size="small" sx={{ mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {course.categoryname}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      {step === 'import' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Import Method
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Adding material to: <strong>{selectedCourse?.fullname}</strong>
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: importType === 'notion' ? 'primary.main' : 'grey.300',
                  '&:hover': { borderColor: 'primary.light' }
                }}
                onClick={() => setImportType('notion')}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Description sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Notion Markdown
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Import content from Notion as a lesson page
                  </Typography>
                  {importType === 'notion' && (
                    <Chip label="Selected" color="primary" sx={{ mt: 2 }} />
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: importType === 'files' ? 'primary.main' : 'grey.300',
                  '&:hover': { borderColor: 'primary.light' }
                }}
                onClick={() => setImportType('files')}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <AttachFile sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    File Upload
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload documents, images, or other files
                  </Typography>
                  {importType === 'files' && (
                    <Chip label="Selected" color="primary" sx={{ mt: 2 }} />
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: importType === 'manual' ? 'primary.main' : 'grey.300',
                  '&:hover': { borderColor: 'primary.light' }
                }}
                onClick={() => setImportType('manual')}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Edit sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Create Manually
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create content from scratch
                  </Typography>
                  {importType === 'manual' && (
                    <Chip label="Selected" color="primary" sx={{ mt: 2 }} />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            {importType === 'notion' && (
              <Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md"
                  onChange={handleNotionImport}
                  style={{ display: 'none' }}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="contained"
                  size="large"
                  startIcon={<CloudUpload />}
                >
                  Upload Markdown File
                </Button>
              </Box>
            )}

            {importType === 'files' && (
              <Box>
                <input
                  type="file"
                  multiple
                  onChange={handleFileImport}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="contained"
                  size="large"
                  startIcon={<AttachFile />}
                >
                  Upload Files
                </Button>
              </Box>
            )}

            {importType === 'manual' && (
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

      {step === 'configure' && (
        <>
          <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Configure Material
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Material Title"
                  value={materialData.title}
                  onChange={(e) => setMaterialData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter material title"
                  fullWidth
                  required
                />

                <FormControl fullWidth>
                  <InputLabel>Material Type</InputLabel>
                  <Select
                    value={materialData.type}
                    label="Material Type"
                    onChange={(e) => setMaterialData(prev => ({ ...prev, type: e.target.value as any }))}
                  >
                    <MenuItem value="page">Page</MenuItem>
                    <MenuItem value="resource">File/Resource</MenuItem>
                    <MenuItem value="assign">Assignment</MenuItem>
                    <MenuItem value="quiz">Quiz</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Content"
                  value={materialData.content}
                  onChange={(e) => setMaterialData(prev => ({ ...prev, content: e.target.value }))}
                  multiline
                  rows={8}
                  placeholder="Enter material content or description"
                  fullWidth
                />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Attachments</Typography>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    onChange={handleAttachmentUpload}
                    style={{ display: 'none' }}
                  />
                  <Button
                    onClick={() => attachmentInputRef.current?.click()}
                    startIcon={<AttachFile />}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  >
                    Add Files
                  </Button>

                  {attachedFiles.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {attachedFiles.map((file, index) => (
                        <Chip
                          key={index}
                          label={file.name}
                          onDelete={() => removeAttachment(index)}
                          deleteIcon={<Delete />}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            {importPreview && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Import Preview
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Title:</strong> {importPreview.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Type:</strong> {importPreview.type}
                  </Typography>
                  {importPreview.hasFiles && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Files:</strong> {importPreview.fileCount}
                    </Typography>
                  )}
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Content Preview:
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: 'grey.100',
                    borderRadius: 1,
                    maxHeight: 300,
                    overflow: 'auto',
                    fontSize: '0.875rem'
                  }}
                  dangerouslySetInnerHTML={{ __html: importPreview.content.substring(0, 500) + '...' }}
                />
              </Paper>
            )}
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
            onClick={handleCreateMaterial}
            disabled={loading || !materialData.title}
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <Create />}
          >
            {loading ? 'Adding Material...' : 'Add to Course'}
          </Button>
        </Box>
        </>
      )}

      {step === 'create' && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main' }} />
            <Typography variant="h4" component="h2">
              Material Added Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Your teaching material has been added to the course and is ready for students.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                onClick={resetForm}
                variant="outlined"
                startIcon={<Create />}
              >
                Add Another Material
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

export default MaterialImporter;